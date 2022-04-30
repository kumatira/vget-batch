import { LocalConfig } from './localConfig';

interface ApplicationConfig {
    readonly awsProfile: string;
    readonly youtubeAPIKey: string;
}

const appConfig: ApplicationConfig = (() => {
    const nodeEnv = process.env.NODE_ENV;
    switch (nodeEnv) {
        default:
            return new LocalConfig();
    }
})();

export { ApplicationConfig, appConfig };
