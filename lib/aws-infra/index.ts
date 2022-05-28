import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, WriteRequest } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Readable } from 'stream';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { appConfig } from '../../config/index';
import { isRunOnLocal } from '../util';

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

export type DDBRecord = {
    id: string;
    dataType: string;
    dataValue?: string;
    collection?: {
        operationType: string;
        at: string;
        by: string;
    };
};

export class InfrastructureDynamoDB {
    static batchThreshold = 25;
    private static makeDDBClient = (): DynamoDBDocumentClient => {
        if (isRunOnLocal()) {
            return DynamoDBDocumentClient.from(
                new DynamoDBClient({
                    region: 'ap-northeast-1',
                    credentials: fromIni({ profile: appConfig.awsProfile }),
                })
            );
        } else {
            return DynamoDBDocumentClient.from(
                new DynamoDBClient({
                    region: 'ap-northeast-1',
                })
            );
        }
    };

    public static async isItemExist(id: string, dataType: string): Promise<boolean> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new GetCommand({
                    TableName: tableName,
                    Key: {
                        id: id,
                        dataType: dataType
                    }
                })
            );
            return result.Item !== undefined; //項目が存在しない場合はItemがundefinedで返ってくる
        } catch (e: any) {
            console.log(e);
            return false;
        }
    }

    public static async batchWriteItems(items: any[]): Promise<undefined> {
        const dDBClient = this.makeDDBClient();

        const putRequestItems: WriteRequest[] = items.map(item => {
            return {
                PutRequest: {
                    Item: item,
                },
            };
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
                    new BatchWriteCommand({
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

    public static async getRecordsById(id: string): Promise<DDBRecord[] | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'id = :id',
                    ExpressionAttributeValues: {
                        ':id': `${id}`,
                    },
                })
            );
            const queriedRecords = result.Items as DDBRecord[];
            return queriedRecords;
        } catch (e: any) {
            console.log(e);
            return;
        }
    }
}
