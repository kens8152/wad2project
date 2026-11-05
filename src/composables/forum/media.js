const VIDEO_ENDING = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i

export const isVideo = (media) =>
  typeof media === 'string' ? VIDEO_ENDING.test(media) : !!media?.file?.type.startsWith('video/') || (typeof media?.url === 'string' && isVideo(media.url))
