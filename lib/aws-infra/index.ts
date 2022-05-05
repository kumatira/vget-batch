import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, BatchWriteItemCommand, WriteRequest, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { Readable } from 'stream';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { Video } from '../youtube';
import { appConfig } from '../../config/index';
import { isRunOnLocal } from '../util';
import { DateTime } from 'luxon';

export class InfrastructureS3 {
    static makeS3Client = (): S3Client => {
        if (isRunOnLocal()) {
            return new S3Client({
                region: 'ap-northeast-1',
                credentials: fromIni({ profile: appConfig.awsProfile }),
            });
        } else {
            return new S3Client({
                region: 'ap-northeast-1',
            });
        }
    };

    public static async getTextFromS3(bucket: string, key: string): Promise<string> {
        const s3Client = this.makeS3Client();
        try {
            const output = await s3Client.send(
                new GetObjectCommand({
                    Bucket: bucket,
                    Key: key,
                })
            );
            const stream = output.Body;
            if (!(stream instanceof Readable)) {
                throw new Error('Invalid S3 Body');
            }
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks).toString();
        } catch (e: any) {
            console.log(e);
            return e;
        }
    }
}

export class InfrastructureDynamoDB {
    static batchThreshold = 25;
    private static makeDDBClient = (): DynamoDBClient => {
        if (isRunOnLocal()) {
            return new DynamoDBClient({
                region: 'ap-northeast-1',
                credentials: fromIni({ profile: appConfig.awsProfile }),
            });
        } else {
            return new DynamoDBClient({
                region: 'ap-northeast-1',
            });
        }
    };

    public static async checkVideoIdIsExistAtDDB(videoId: string): Promise<boolean> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new GetItemCommand({
                    TableName: tableName,
                    Key: {
                        id: { S: `YT_V_${videoId}` },
                        dataType: { S: 'VideoCollectionMetaData' },
                    },
                })
            );
            if (result.Item !== undefined) {
                //項目が存在しない場合はItemがundefinedで返ってくる
                return true;
            } else {
                return false;
            }
        } catch (e: any) {
            console.log(e);
            return false;
        }
    }

    public static async putVideosToDDB(videos: Video[]): Promise<undefined> {
        const dDBClient = this.makeDDBClient();

        const putRequestItems: WriteRequest[] = videos.reduce((acc: WriteRequest[], cur: Video): WriteRequest[] => {
            const videoCollectionMetaData = {
                L: [
                    {
                        M: {
                            operationType: { S: 'create' },
                            at: { S: DateTime.utc().toString() },
                            by: { S: 'vget-batch' },
                        },
                    },
                ],
            };
            const putRequests: WriteRequest[] = [
                //確実にある項目
                //ToDo: descriptionとthumbnailsを追加する
                {
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'VideoCollectionMetaData' },
                            collection: videoCollectionMetaData,
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'VideoTitle' },
                            dataValue: { S: cur.title },
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'ChannelID' },
                            dataValue: { S: `YT_C_${cur.channelID}` },
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'PublishedAt' },
                            dataValue: { S: cur.publishedAt },
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'PublishedAt' },
                            dataValue: { S: cur.publishedAt },
                        },
                    },
                },
            ];
            if (cur.actualStartTime) {
                putRequests.push({
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'ActualStartTime' },
                            dataValue: { S: cur.actualStartTime },
                        },
                    },
                });
            }
            if (cur.actualEndTime) {
                putRequests.push({
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'ActualEndTime' },
                            dataValue: { S: cur.actualEndTime },
                        },
                    },
                });
            }
            if (cur.scheduledStartTime) {
                putRequests.push({
                    PutRequest: {
                        Item: {
                            id: { S: `YT_V_${cur.id}` },
                            dataType: { S: 'ScheduledStartTime' },
                            dataValue: { S: cur.scheduledStartTime },
                        },
                    },
                });
            }
            return acc.concat(putRequests);
        }, []);

        const dividePutRequestItems: WriteRequest[][] = [];
        for (let i = 0; i < putRequestItems.length; i += this.batchThreshold) {
            // BatchWriteできる大きさに分割
            dividePutRequestItems.push(putRequestItems.slice(i, i + this.batchThreshold));
        }

        for (const item of dividePutRequestItems) {
            try {
                const tableName = appConfig.dataTableName;
                const result = await dDBClient.send(
                    new BatchWriteItemCommand({
                        RequestItems: {
                            [tableName]: item, // キーにテーブル名を指定
                        },
                    })
                );
                console.log('保存結果: ', result);
            } catch (e: any) {
                console.log(JSON.stringify(item, null, 2));
                console.log(e);
            }
        }
        return;
    }
}
