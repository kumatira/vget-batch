import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { appConfig } from '../../config/index';
import { videoId } from '../models/video';
import Parser from 'rss-parser';

export class YoutubeDataAPI {
    static youtubeAPIPrefix = 'https://www.googleapis.com/youtube/v3';

    public static async getVideoIdsByChannelID(channelId: string): Promise<videoId[]> {
        let videos:videoId[] = [];
        let options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/search`,
            method: 'GET',
            params: {
                part: 'id',
                key: appConfig.youtubeAPIKey,
                channelId: channelId,
                // order: 'date', この設定をすると動画が取れないことがある
                type: 'video',
                maxResults: '50',
            },
        };
        try {
            // totalResultsは正確な数字でないことに注意 > Please note that the value is an approximation and may not represent an exact value.
            const firstRes: AxiosResponse<any> = await axios(options); // GET
            let nextPageToken: string | undefined = firstRes.data.nextPageToken;
            const firstResItems = firstRes.data.items.map((i: FetchedVideoOnlyIDObj) => i.id.videoId as videoId);
            videos = videos.concat(firstResItems)
            while (nextPageToken !== undefined) {
                options.params.pageToken = nextPageToken;
                const res: AxiosResponse<any> = await axios(options); // GET
                nextPageToken = res.data.nextPageToken;
                const resItems = res.data.items.map((i: FetchedVideoOnlyIDObj) => i.id.videoId as videoId);
                videos = videos.concat(resItems)
            }
            return videos
        } catch (e: any) {
            console.log(e);
            return e;
        }
    }

    public static async getChannelByChannelID(channelId: string): Promise<any> {
        const options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/channels`,
            method: 'GET',
            params: {
                part: 'snippet',
                key: appConfig.youtubeAPIKey,
                id: channelId,
            },
        };
        try {
            const res: AxiosResponse<any[]> = await axios(options); // GET
            return res.data;
        } catch (e: any) {
            console.log(e);
            return e;
        }
    }

    public static async getVideoByVideoID(videoId: string): Promise<FetchedVideoObj> {
        const options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/videos`,
            method: 'GET',
            params: {
                part: 'snippet,liveStreamingDetails',
                key: appConfig.youtubeAPIKey,
                id: videoId,
                maxResults: '1',
            },
        };
        try {
            const res: AxiosResponse<APIVideoResponse> = await axios(options); // GET
            return res.data.items[0];
        } catch (e: any) {
            console.log(e);
            return e;
        }
    }
}

export class YoutubeRSS {
    static youtubeRSSPrefix = 'https://www.youtube.com/feeds/videos.xml';

    public static async getVideoIdsByChannelID(channelId: string): Promise<videoId[]> {
        let options: AxiosRequestConfig = {
            url: this.youtubeRSSPrefix,
            method: 'GET',
            params: {
                channel_id: channelId
            }
        };
        try {
            const parser: Parser = new Parser({ //https://www.npmjs.com/package/rss-parser
                customFields: {
                    item: [['yt:videoId', 'youtubeVideoId']],
                }
            });
            const rssBody: string = (await axios(options)).data; // GET
            const feed = await parser.parseString(rssBody);
            return feed.items.map(item=> item.youtubeVideoId)
        } catch (e: any) {
            console.log(e);
            return e;
        }
    }
}

export type FetchedVideoOnlyIDObj = {
    kind: string;
    etag: string;
    id: {
        kind: string;
        videoId: string;
    };
};

export type FetchedVideoSnippet = {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: FetchedVideoThumbnails;
    channelTitle: string;
    tags: string[];
    categoryId: string;
    liveBroadcastContent: string;
    localized: {
        title: string;
        description: string;
    };
    defaultAudioLanguage: string;
};

type FetchedVideoThumbnails = {
    default: FetchedVideoThumbnailDetail;
    medium?: FetchedVideoThumbnailDetail;
    high?: FetchedVideoThumbnailDetail;
    standard?: FetchedVideoThumbnailDetail;
    maxres?: FetchedVideoThumbnailDetail;
};

type FetchedVideoThumbnailDetail = {
    url: string;
    width: number;
    height: number;
};

type FetchedVideoLiveStreamingDetails = {
    actualStartTime: string;
    actualEndTime: string;
    scheduledStartTime: string;
};

export type FetchedVideoObj = {
    kind: string;
    etag: string;
    id: string;
    snippet: FetchedVideoSnippet;
    liveStreamingDetails?: FetchedVideoLiveStreamingDetails;
};

type APIVideoResponse = {
    kind: string;
    etag: string;
    items: FetchedVideoObj[];
};