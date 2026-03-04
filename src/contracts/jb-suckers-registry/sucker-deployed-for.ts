import { type Context, type Event, ponder } from "ponder:registry";
import { project, sucker, suckerGroup, suckerGroupByAddress } from "ponder:schema";

ponder.on("JBSuckersRegistry:SuckerDeployedFor", suckerDeployedFor);

function makeProjectUniqueId(chainId: number, projectId: number): string {
  return `${chainId}-${projectId}`;
}

function parseProjectUniqueId(value: string): { chainId: number; projectId: number } | null {
  const parts = value.split("-");
  if (parts.length !== 2) return null;

  const chainId = Number(parts[0]);
  const projectId = Number(parts[1]);
  if (Number.isNaN(chainId) || Number.isNaN(projectId)) return null;

  return { chainId, projectId };
}

function normalizeAddress(value: `0x${string}`): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

async function suckerDeployedFor(params: {
  event: Event<"JBSuckersRegistry:SuckerDeployedFor">;
  context: Context<"JBSuckersRegistry:SuckerDeployedFor">;
}) {
  const { context, event } = params;
  const { args } = event;
  const { projectId: _projectId, sucker: address } = args;
  const projectId = Number(_projectId);
  const chainId = context.chain.id;

  // Find the project that emitted this event
  const thisProject = await context.db.find(project, {
    chainId,
    projectId,
  });

  if (!thisProject) {
    throw new Error(`Missing project ${projectId} on chain ${chainId}`);
  }

  // Create unique identifier for this project
  const thisProjectUniqueId = makeProjectUniqueId(chainId, projectId);

  // Normalize address to lowercase for consistent comparisons
  const normalizedAddress = normalizeAddress(address);
  const candidateGroupIds = new Set<string>([thisProject.suckerGroupId]);

  // Address lookup table catches cross-project overlap without non-PK scans.
  const addressLookup = await context.db.find(suckerGroupByAddress, {
    id: normalizedAddress,
  });
  if (addressLookup) candidateGroupIds.add(addressLookup.suckerGroupId);

  const mergedProjects = new Set<string>([thisProjectUniqueId]);
  const mergedAddresses = new Set<`0x${string}`>([normalizedAddress]);
  const supersededGroupIds = new Set<string>();

  for (const groupId of candidateGroupIds) {
    const existingGroup = await context.db.find(suckerGroup, { id: groupId });
    if (!existingGroup) continue;

    supersededGroupIds.add(existingGroup.id);
    for (const projectUniqueId of existingGroup.projects) mergedProjects.add(projectUniqueId);
    for (const existingAddress of existingGroup.addresses) {
      mergedAddresses.add(normalizeAddress(existingAddress));
    }
  }

  const nextProjects = Array.from(mergedProjects).sort();
  const nextAddresses = Array.from(mergedAddresses).sort();
  const newSuckerGroup = await context.db.insert(suckerGroup).values({
    projects: nextProjects,
    addresses: nextAddresses,
    createdAt: Number(event.block.timestamp),
  });

  // Update all affiliated projects to point to the new merged group.
  for (const projectUniqueId of nextProjects) {
    const parsed = parseProjectUniqueId(projectUniqueId);
    if (!parsed) continue;

    const existingProject = await context.db.find(project, {
      chainId: parsed.chainId,
      projectId: parsed.projectId,
    });
    if (!existingProject) continue;

    await context.db
      .update(project, {
        chainId: parsed.chainId,
        projectId: parsed.projectId,
      })
      .set({
        suckerGroupId: newSuckerGroup.id,
      });
  }

  // Upsert address lookup rows so future events can resolve group by address via PK.
  for (const groupAddress of nextAddresses) {
    await context.db
      .insert(suckerGroupByAddress)
      .values({
        id: groupAddress,
        suckerGroupId: newSuckerGroup.id,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        suckerGroupId: newSuckerGroup.id,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }

  // Remove superseded groups by primary key.
  for (const groupId of supersededGroupIds) {
    if (groupId === newSuckerGroup.id) continue;
    await context.db.delete(suckerGroup, { id: groupId });
  }

  // Finally, record the sucker itself
  await context.db.insert(sucker).values({
    chainId,
    projectId,
    address: normalizedAddress,
  });
}
