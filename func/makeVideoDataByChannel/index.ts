import { YoutubeDataAPI, FetchedVideoOnlyIDObj, VideoInSummary } from '../../lib/youtube';
import { InfrastructureS3, InfrastructureDynamoDB } from '../../lib/aws-infra';
import { isRunOnLocal } from '../../lib/util';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const lambdaHandler = async (): Promise<undefined> => {
    type TargetChannel = {
        id: string;
        name: string;
    };
    const targetChannels: TargetChannel[] = JSON.parse(await InfrastructureS3.getTextFromS3('vget-api-channels', 'channels.json'));
    const targetChannelIds = targetChannels.map((i: TargetChannel): string => i.id);
    const promises = targetChannelIds.map((id) => YoutubeDataAPI.getVideosByChannelID(id, true));
    const fetchedVideosByChannels = await Promise.all(promises);
    const fetchedVideoObjs = fetchedVideosByChannels.reduce((pre: any[], cur: any) => pre.concat(cur.items), []) as FetchedVideoOnlyIDObj[];
    const targetVideosInSummary = await Promise.all(fetchedVideoObjs.map((f) => new VideoInSummary(f).checkCreateRequired()));
    const targetVideosCreateRequired = targetVideosInSummary.filter((v) => v.createRequired);

    const targetVideos = await Promise.all(targetVideosCreateRequired.map((f) => f.makeFullVideoData()));

    await InfrastructureDynamoDB.putVideosToDDB(targetVideos);
    return;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    lambdaHandler();
}
