import { operationalGlobalSetup } from "./operational-global-setup.mjs";
const operationalE2eGlobalSetup = () => operationalGlobalSetup({ suite: "e2e" });
export default operationalE2eGlobalSetup;
