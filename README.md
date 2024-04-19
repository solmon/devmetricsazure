# devmetricsazure
Azure Git metrics scripts

# Prerequisites
- Azure DevOps Node API 
- PAT Token for Azure DevOps authentication
- Node.js and npm installed

# Installation
npm i
npm run build
npm start

# configuration
projectconfig.template.json file needs to be renamed to projectconfig.json
 and updated with the following:
 Project Name
 Repositories to target
 Branches for Analysis

Following Environment variables are mandatory:
"API_URL": "<DevOps Organization URL>",
"API_TOKEN":"<PAT Token>",
"API_PROJECT":"<Project Name>"