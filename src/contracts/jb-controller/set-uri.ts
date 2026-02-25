import { type Context, type Event, ponder } from "ponder:registry";
import { project } from "ponder:schema";

ponder.on("JBController:SetUri", setUri);

async function setUri(params: {
  event: Event<"JBController:SetUri">;
  context: Context<"JBController:SetUri">;
}) {
  const { event, context } = params;
  const { args } = event;
  const { projectId: _projectId, uri } = args;
  const projectId = Number(_projectId);
  const chainId = context.chain.id;

  await context.db.update(project, { chainId, projectId }).set({
    metadataUri: uri,
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
