import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { appConfig } from '../config/index';

export class YoutubeDataAPI {
    static youtubeAPIPrefix: string = 'https://www.googleapis.com/youtube/v3';

    public static async getVideosByChannelID(channelId: string): Promise<string[]> {
        const options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/search`,
            method: "GET",
            params: {
                part: 'snippet',
                key: appConfig.youtubeAPIKey,
                channelId: channelId,
                order: 'date',
                type: 'video'
            },
        };
        try {
            const res: AxiosResponse<any[]> = await axios(options) // GET
            return res.data
        } catch (e: any) {
            console.log(e);
            return e
        }
    }

    public static async getVideoByVideoID(videoId: string): Promise<string[]> {
        const options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/videos`,
            method: "GET",
            params: {
                part: 'snippet,contentDetails,player',
                key: appConfig.youtubeAPIKey,
                id: videoId,
                maxResults: '1'
            },
        };
        try {
            const res: AxiosResponse<any[]> = await axios(options) // GET
            return res.data
        } catch (e: any) {
            console.log(e);
            return e
        }
    }

}