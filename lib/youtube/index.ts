import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { InfrastructureS3, InfrastructureDynamoDB } from '../../lib/aws-infra';
import { appConfig } from '../../config/index';

export class YoutubeDataAPI {
    static youtubeAPIPrefix = 'https://www.googleapis.com/youtube/v3';

    public static async getVideosByChannelID(channelId: string, onlyIds: boolean): Promise<string[]> {
        const options: AxiosRequestConfig = {
            url: `${this.youtubeAPIPrefix}/search`,
            method: 'GET',
            params: {
                part: onlyIds ? 'id' : 'id,snippet,liveStreamingDetails',
                key: appConfig.youtubeAPIKey,
                channelId: channelId,
                order: 'date',
                type: 'video',
                maxResults: '10',
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

export type FetchedVideoOnlyIDObj = {
    kind: string;
    etag: string;
    id: {
        kind: string;
        videoId: string;
    };
};

type FetchedVideoSnippet = {
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

type VideoThumbnails = {
    default?: string;
    medium?: string;
    high?: string;
    standard?: string;
    maxres?: string;
};
type VideoThumbnailKeys = keyof VideoThumbnails;

export class VideoInSummary {
    readonly id;
    createRequired: undefined | boolean;
    constructor(fetchedData: FetchedVideoOnlyIDObj) {
        this.id = fetchedData.id.videoId;
    }
    // 本当はconstructorの中で呼びたいがawaitできないので外に出している
    async checkCreateRequired(): Promise<VideoInSummary> {
        this.createRequired = !(await InfrastructureDynamoDB.checkVideoIdIsExistAtDDB(this.id));
        return this;
    }

    async makeFullVideoData(): Promise<Video> {
        const fetchedVideoSnippet = await YoutubeDataAPI.getVideoByVideoID(this.id);
        return new Video(fetchedVideoSnippet);
    }
}

export class Video {
    readonly id: string;
    readonly title: string;
    readonly channelID: string;
    readonly publishedAt: string;
    readonly actualStartTime?: string;
    readonly actualEndTime?: string;
    readonly scheduledStartTime?: string;
    readonly Actors?: string[];
    readonly mainActor?: string;
    readonly description: string;
    readonly thumbnails: VideoThumbnails;

    constructor(fetchedData: FetchedVideoObj) {
        const thumbnails: VideoThumbnails = {};
        const setThumbnailsResolutions = Object.keys(fetchedData.snippet.thumbnails) as VideoThumbnailKeys[];
        for (const i of setThumbnailsResolutions) {
            thumbnails[i] = fetchedData.snippet.thumbnails[i]?.url;
        }

        this.id = fetchedData.id;
        this.title = fetchedData.snippet.title;
        this.channelID = fetchedData.snippet.channelId;
        this.publishedAt = fetchedData.snippet.publishedAt;
        if (fetchedData.liveStreamingDetails !== undefined) { //short動画にはliveStreamingDetailsがない
            if (fetchedData.liveStreamingDetails.actualStartTime !== undefined)
                this.actualStartTime = fetchedData.liveStreamingDetails.actualStartTime;
            if (fetchedData.liveStreamingDetails.actualEndTime !== undefined)
                this.actualEndTime = fetchedData.liveStreamingDetails.actualStartTime;
            if (fetchedData.liveStreamingDetails.scheduledStartTime !== undefined)
                this.scheduledStartTime = fetchedData.liveStreamingDetails.scheduledStartTime;
        }

        // this.Actors = [];
        // this.mainActor = '';
        this.description = fetchedData.snippet.description;
        this.thumbnails = thumbnails;
    }
}
