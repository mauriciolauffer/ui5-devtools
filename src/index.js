import { createDevServer } from "devframe/adapters/dev";
import { ui5Devframe } from "./devframe.js";

export { ui5Devframe };
export const startDevServer = (options) => createDevServer(ui5Devframe, options);
export default ui5Devframe;
