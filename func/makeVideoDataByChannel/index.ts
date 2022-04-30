import { YoutubeDataAPI } from '../../lib/youtube';
import { InfrastructureS3 } from '../../lib/aws-infra';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const lambdaHandler = async (): Promise<undefined> => {
    const sampleChannelId = 'UCmalrXbCEmevDLz7hny5J2A';
    const channel = await YoutubeDataAPI.getChannelByChannelID(sampleChannelId);
    console.log(channel.items[0].snippet.title);
    return;
};

module.exports = { lambdaHandler };
