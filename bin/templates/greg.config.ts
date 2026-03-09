import type { GregConfig } from '@dominikcz/greg'

export default {
    rootPath: '{{ROOT_PATH}}',
    mainTitle: '{{TITLE}}',
    sidebar: 'auto',
    // versioning: {
    //     strategy: 'branches', // default
    //     default: 'latest',
    //     aliases: {
    //         latest: '2.1',
    //         stable: '2.0',
    //     },
    //     branches: [
    //         { version: '2.1', branch: 'main', title: '2.1' },
    //         { version: '2.0', branch: 'release/2.0', title: '2.0' },
    //     ],
    // },
} satisfies GregConfig
