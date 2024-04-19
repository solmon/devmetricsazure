// do first just to ensure variables set
// export API_URL=https://buildcanary.visualstudio.com/DefaultCollection
// export export API_TOKEN=<yourAllScopesApiToken>
// export API_PROJECT=test
import {ProjectConfig} from "./projectconfig";
import * as cm from "./common";
import * as git from "./git";
import * as nodeApi from "azure-devops-node-api";
import * as cApi from "azure-devops-node-api/CoreApi";
import * as coreInterfaces from "azure-devops-node-api/interfaces/CoreInterfaces"

let coreApi: cApi.ICoreApi;
const maxLoops: number = 500;

const projectConfig:ProjectConfig = require('../projectconfig.json');

git.run(projectConfig).catch((err) => {
    console.error("Error occurred:", err);
    process.exit(1);
});