import { YoutubeDataAPI } from './youtube/index';
import { InfrastructureS3 } from './aws-infra/index';

// (async () => {
//     console.log(JSON.parse(await InfrastructureS3.getTextFromS3('v-get-api-channels', 'channels.json')));
// })();

(async () => {
    console.log(JSON.stringify(await YoutubeDataAPI.getChannelByChannelID('UCmalrXbCEmevDLz7hny5J2A'), null, 2));
})();
