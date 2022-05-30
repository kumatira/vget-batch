import { VideoWithBatchSummary } from '../../lib/models/videoWithBatchSummary';
import { YoutubeDataAPI } from '../../lib/youtube';
import { InfrastructureS3, InfrastructureDynamoDB } from '../../lib/aws-infra';
import { isRunOnLocal, uniq } from '../../lib/util';

const lambdaHandler = async (): Promise<undefined> => {
    const targetChannels: {id: string, name: string}[] = JSON.parse(await InfrastructureS3.getTextFromS3('vget-api-channels', 'channels.json'));
    console.log('targetChannels', targetChannels);
    const targetChannelIds = targetChannels.map((i): string => i.id);
    const targetVideoIds = uniq((await Promise.all(targetChannelIds.map((id) => YoutubeDataAPI.getVideoIdsByChannelID(id)))).flat());
    const targetVideosWithBatchSummary = await Promise.all(targetVideoIds.map((id) => VideoWithBatchSummary.init(id)));
    const insertRecords = targetVideosWithBatchSummary.map((v) => v.getInsertItems()).flat();
    console.log('insertRecords', insertRecords);
    await InfrastructureDynamoDB.batchWriteItems(insertRecords);
    return;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    lambdaHandler();
}
