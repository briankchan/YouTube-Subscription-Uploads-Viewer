/**
 * Manages everything to do with video objects in code.
 * Would be the video object itself if Chrome allowed saving of non-vanilla JavaScript objects.
 */

exports.createNewVideo = function() { return [11]; };

exports.getId = function(video) { return video[0]; };
exports.setId = function(video, id) { video[0] = id; };

exports.getTitle = function(video) { return video[1]; }; 
exports.setTitle = function(video, title) { video[1] = title; };

exports.getChannel = function(video) { return video[2]; };
exports.setChannel = function(video, uploader) { video[2] = uploader };

exports.getDescription = function(video) { return video[3]; };
exports.setDescription = function(video, desc) { video[3] = desc; };

exports.getThumbnail = function(video) { return video[4]; };
exports.setThumbnail = function(video, thumb) { video[4] = thumb; };

exports.getUploadTime = function(video) { return video[5]; };
exports.setUploadTime = function(video, time) { video[5] = time; };

exports.getDuration = function(video) { return video[6]; };
exports.setDuration = function(video, dur) { video[6] = dur; };

exports.getViewCount = function(video) { return video[7]; };
exports.setViewCount = function(video, views) { video[7] = views; };

exports.getLikesCount = function(video) { return video[8]; };
exports.setLikesCount = function(video, likes) { video[8] = likes; };

exports.getDislikesCount = function(video) { return video[9]; };
exports.setDislikesCount = function(video, dislikes) { video[9] = dislikes; };

exports.getCommentsCount = function(video) { return video[10]; };
exports.setCommentsCount = function(video, comments) { video[10] = comments; };
