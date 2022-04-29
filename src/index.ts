import { YoutubeDataAPI } from './youtube/index';
import { InfrastructureS3 } from './aws-infra/index';

(async () => {
    console.log(await InfrastructureS3.getTextFromS3('v-get-api-channels', 'test.txt'));
})();

(async () => {
    console.log(JSON.stringify(await YoutubeDataAPI.getVideoByVideoID('TGOenZUIxd4'), null, 2));
})();
