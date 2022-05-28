import { FetchedVideoObj } from "../youtube";

type VideoThumbnails = {
    default?: string;
    medium?: string;
    high?: string;
    standard?: string;
    maxres?: string;
};
type VideoThumbnailKeys = keyof VideoThumbnails;
export type videoId = string;

export class Video {
    readonly id: string;
    readonly title: string;
    readonly channelID: string;
    readonly publishedAt: string;
    readonly actualStartTime?: string;
    readonly actualEndTime?: string;
    readonly scheduledStartTime?: string;
    readonly videoType: 'video' | 'live';
    readonly Actors?: string[];
    readonly mainActor?: string;
    readonly thumbnails: VideoThumbnails;

    static tableDataTypeMap = {
        title: 'VideoTitle',
        channelID: 'ChannelID',
        publishedAt: 'PublishedAt',
        scheduledStartTime: 'ScheduledStartTime',
        actualStartTime: 'ActualStartTime',
        actualEndTime: 'ActualEndTime',
        videoType: 'VideoType',
        thumbnails: 'Thumbnails'
    };

    constructor(fetchedData: FetchedVideoObj) {
        const thumbnails: VideoThumbnails = {};
        const setThumbnailsResolutions = Object.keys(fetchedData.snippet.thumbnails) as VideoThumbnailKeys[];
        for (const i of setThumbnailsResolutions) {
            thumbnails[i] = fetchedData.snippet.thumbnails[i]?.url;
        }

        this.id = fetchedData.id;
        this.title = fetchedData.snippet.title;
        this.channelID = `YT_C_${fetchedData.snippet.channelId}`;
        this.publishedAt = fetchedData.snippet.publishedAt;
        if (fetchedData.liveStreamingDetails !== undefined) { //動画・short動画にはliveStreamingDetailsがない
            this.videoType = 'live';
            if (fetchedData.liveStreamingDetails.actualStartTime !== undefined)
                this.actualStartTime = fetchedData.liveStreamingDetails.actualStartTime;
            if (fetchedData.liveStreamingDetails.actualEndTime !== undefined)
                this.actualEndTime = fetchedData.liveStreamingDetails.actualStartTime;
            if (fetchedData.liveStreamingDetails.scheduledStartTime !== undefined)
                this.scheduledStartTime = fetchedData.liveStreamingDetails.scheduledStartTime;
        } else {
            this.videoType = 'video';
        }

        // this.Actors = [];
        // this.mainActor = '';
        // this.description = fetchedData.snippet.description;
        this.thumbnails = thumbnails;
    }
}