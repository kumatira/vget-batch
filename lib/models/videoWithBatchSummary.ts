import { Video, videoId } from "./video";
import { InfrastructureDynamoDB } from '../../lib/aws-infra';
import { YoutubeDataAPI } from "../youtube";

interface InsertRequiredByColumn {
    title: boolean
    channelID: boolean
    publishedAt: boolean
    scheduledStartTime?: Boolean
    actualStartTime?: Boolean
    actualEndTime?: Boolean
    videoType: boolean
}

export class VideoWithBatchSummary{
    readonly id: string;
    readonly createRequired: boolean;
    readonly insertRequiredByColumn: InsertRequiredByColumn;
    readonly video?: Video;

    private constructor(videoId: videoId, createRequired: boolean, insertRequiredByColumn: InsertRequiredByColumn, video?: Video) {
        this.id = videoId;
        this.createRequired = createRequired;
        this.insertRequiredByColumn = insertRequiredByColumn
        this.video = video;
    }
    // 本当はconstructorの中で呼びたいがawaitできないので外に出している
    static async init(youTubeVideoId: string): Promise<VideoWithBatchSummary> {
        const videoId = `YT_V_${youTubeVideoId}`
        const existingRecords = await InfrastructureDynamoDB.getRecordsById(videoId);
        const createRequired = (existingRecords === undefined || existingRecords.length === 0);
        if (createRequired) {
            const insertRequiredByColumn: InsertRequiredByColumn = {
                publishedAt: true,
                channelID: true,
                title: true,
                videoType: true,
                scheduledStartTime: true,
                actualStartTime: true,
                actualEndTime: true
            }
            const fetchedVideoSnippet = await YoutubeDataAPI.getVideoByVideoID(youTubeVideoId);
            const video = new Video(fetchedVideoSnippet);
            return new VideoWithBatchSummary(videoId, createRequired, insertRequiredByColumn, video);
        } else {
            const videoType = existingRecords.find(r=>r.dataType === 'VideoType')
            const insertRequiredByColumn: InsertRequiredByColumn = {
                publishedAt: (existingRecords.find(r=>r.dataType === 'PublishedAt') === undefined),
                channelID: (existingRecords.find(r=>r.dataType === 'ChannelID') === undefined),
                title: (existingRecords.find(r=>r.dataType === 'VideoTitle') === undefined),
                videoType: ( videoType === undefined),
            }
            if (videoType !== undefined && videoType.dataValue === 'live') {
                insertRequiredByColumn.scheduledStartTime = (existingRecords.find(r=>r.dataType === 'ScheduledStartTime') === undefined)
                insertRequiredByColumn.actualStartTime = (existingRecords.find(r=>r.dataType === 'ActualStartTime') === undefined)
                insertRequiredByColumn.actualEndTime = (existingRecords.find(r=>r.dataType === 'ActualEndTime') === undefined)
            }
            if (Object.values(insertRequiredByColumn).some(v=>v)) {
                const fetchedVideoSnippet = await YoutubeDataAPI.getVideoByVideoID(youTubeVideoId);
                const video = new Video(fetchedVideoSnippet);
                return new VideoWithBatchSummary(videoId, createRequired, insertRequiredByColumn, video);
            } else {
                const insertRequiredByColumn: InsertRequiredByColumn = {
                    publishedAt: false,
                    channelID: false,
                    title: false,
                    videoType: false
                }
                return new VideoWithBatchSummary(videoId, createRequired, insertRequiredByColumn, undefined)
            }
        }
    }

    getInsertItems(): {id: string, dataType: string, dataValue: string}[] {
        const items = [];
        if( this.insertRequiredByColumn.publishedAt && this.video?.publishedAt !== undefined){
            const dataType = Video.tableDataTypeMap['publishedAt']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.publishedAt
            })
        }
        if( this.insertRequiredByColumn.channelID && this.video?.channelID !== undefined){
            const dataType = Video.tableDataTypeMap['channelID']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.channelID
            })
        }
        if( this.insertRequiredByColumn.title && this.video?.title !== undefined){
            const dataType = Video.tableDataTypeMap['title']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.title
            })
        }
        if( this.insertRequiredByColumn.videoType && this.video?.videoType !== undefined){
            const dataType = Video.tableDataTypeMap['videoType']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.videoType
            })
        }
        if( this.insertRequiredByColumn.scheduledStartTime && this.video?.scheduledStartTime !== undefined){
            const dataType = Video.tableDataTypeMap['scheduledStartTime']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.scheduledStartTime
            })
        }
        if( this.insertRequiredByColumn.actualStartTime && this.video?.actualStartTime !== undefined){
            const dataType = Video.tableDataTypeMap['actualStartTime']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.actualStartTime
            })
        }
        if( this.insertRequiredByColumn.actualEndTime && this.video?.actualEndTime !== undefined){
            const dataType = Video.tableDataTypeMap['actualEndTime']
            items.push({
                id: this.id,
                dataType: dataType,
                dataValue: this.video.actualEndTime
            })
        }
        return items
    }
}

