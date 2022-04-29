import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import {fromIni} from "@aws-sdk/credential-provider-ini"
import { appConfig } from '../config/index';

export class InfrastructureS3 {
    static s3Client = new S3Client({
        region: 'ap-northeast-1',
        credentials: fromIni({profile: appConfig.awsProfile})
    });

    public static async getTextFromS3(bucket: string, key: string): Promise<string> {
        try {
            const output = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: bucket,
                    Key: key
                })
            );
            const stream  = output.Body;
            if (!(stream instanceof Readable)) {
                throw new Error('Invalid S3 Body');
            }
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {chunks.push(chunk);}
            return Buffer.concat(chunks).toString();
        } catch (e: any) {
            console.log(e);
            return e
        }
    }

}