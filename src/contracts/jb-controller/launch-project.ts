import { type Context, type Event, ponder } from "ponder:registry";
import { project } from "ponder:schema";

ponder.on("JBController:LaunchProject", launchProject);

async function launchProject(params: {
  event: Event<"JBController:LaunchProject">;
  context: Context<"JBController:LaunchProject">;
}) {
  const { event, context } = params;
  const { args } = event;
  const { projectId: _projectId, caller, projectUri } = args;
  const projectId = Number(_projectId);
  const chainId = context.chain.id;

  await context.db.update(project, { chainId, projectId }).set({
    deployer: caller,
    metadataUri: projectUri,
    metadata: null,
    name: null,
    infoUri: null,
    logoUri: null,
    coverImageUri: null,
    twitter: null,
    discord: null,
    telegram: null,
    tokens: null,
    domain: null,
    description: null,
    tags: null,
    projectTagline: null,
  });
}
