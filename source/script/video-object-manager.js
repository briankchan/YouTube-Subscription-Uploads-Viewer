/**
 * Manages everything to do with video objects in code.
 * Would be the video object itself if Chrome allowed saving of non-vanilla JavaScript objects.
 */

exports.createNewVideo = function() { return []; };

exports.getTitle = function(video) { return video[0]; }; 
exports.setTitle = function(video, title) { video[0] = title; };

exports.getDescription = function(video) { return video[1]; };
exports.setDescription = function(video, desc) { video[1]=desc; };

exports.getThumbnail = function(video) { return video[2]; };
exports.setThumbnail = function(video, thumb) { video[2] = thumb; };

exports.getUploadTime = function(video) { return video[3]; };
exports.setUploadTime = function(video, time) { video[3] = time; };

exports.getDuration = function(video) { return video[4]; };
exports.setDuration = function(video, dur) { video[4] = dur; };

exports.getViewCount = function(video) { return video[5]; };
exports.setViewCount = function(video, views) { video[5] = views; };

exports.getLikesCount = function(video) { return video[6]; };
exports.setLikesCount = function(video, likes) { video[6] = likes; };

exports.getDislikesCount = function(video) { return video[7]; };
exports.setDislikesCount = function(video, dislikes) { video[7] = dislikes; };

exports.getCommentsCount = function(video) { return video[8]; };
exports.setCommentsCount = function(video, comments) { video[8] = comments; };
