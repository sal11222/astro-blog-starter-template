---
title: "Cloudflare Stream API Documentation"
description: "Reference documentation for the Cloudflare Stream API: videos, live inputs, captions, watermarks, signed URLs, and more, with Node.js SDK examples."
pubDate: "Jul 09 2026"
---

This reference covers the Cloudflare Stream API as exposed by the official Node.js SDK (`cloudflare` package). All endpoints are rooted at `/accounts/{account_id}/stream` and authenticated with an API token:

```js
import Cloudflare from 'cloudflare';

const client = new Cloudflare({
  apiToken: process.env['CLOUDFLARE_API_TOKEN'], // This is the default and can be omitted
});
```

## Table of contents

- [Videos](#videos)
- [Audio Tracks](#audio-tracks)
- [Storage Usage](#storage-usage)
- [Clip](#clip)
- [Copy (upload from URL)](#copy-upload-from-url)
- [Direct Upload](#direct-upload)
- [Signing Keys](#signing-keys)
- [Live Inputs](#live-inputs)
- [Outputs (simulcasting)](#outputs-simulcasting)
- [Watermarks](#watermarks)
- [Webhooks](#webhooks)
- [Captions](#captions)
- [Downloads](#downloads)
- [Embed](#embed)
- [Token (signed URLs)](#token-signed-urls)
- [The Video object](#the-video-object)

---

## Videos

### List videos

`client.stream.list(params, options?): SinglePage<Video>`

**GET** `/accounts/{account_id}/stream`

Lists up to 1000 videos from a single request. For a specific range, refer to the optional parameters.

**Parameters** (`StreamListParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `id?` | `string` | Filter by video ID(s). Single ID or comma-separated list. |
| `after?` | `string` | Alias for `start`. Returns videos created after this date/time (RFC 3339). |
| `asc?` | `boolean` | Lists videos in ascending order of creation. |
| `before?` | `string` | Alias for `end`. Returns videos created before this date/time (RFC 3339). |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `end?` | `string` | Lists videos created before the specified date. |
| `include_counts?` | `boolean` | Includes the total number of videos matching the query. |
| `limit?` | `number` | Maximum number of videos to return (default 1000, max 1000). |
| `live_input_id?` | `string` | Filter by live input ID to find videos associated with a specific live stream. |
| `name?` | `string` | Filter by video name/UID(s). Single name or comma-separated list. |
| `search?` | `string` | Partial word match on the `name` key in `meta`. Slow for medium to large libraries; may be unavailable for very large ones. |
| `start?` | `string` | Lists videos created after the specified date. |
| `status?` | enum | Processing status: `pendingupload`, `downloading`, `queued`, `inprogress`, `ready`, `error`, `live-inprogress`. |
| `type?` | `string` | Whether the video is `vod` or `live`. |
| `video_name?` | `string` | Fast, exact string match on the `name` key in `meta`. |

**Returns:** a paginated list of [`Video`](#the-video-object) objects.

```js
// Automatically fetches more pages as needed.
for await (const video of client.stream.list({ account_id: '023e105f4ecef8ad9ca31a8372d0c353' })) {
  console.log(video.uid);
}
```

### Retrieve video details

`client.stream.get(identifier, params, options?): Video`

**GET** `/accounts/{account_id}/stream/{identifier}`

Fetches details for a single video.

**Parameters:**

- `identifier: string` — a Cloudflare-generated unique identifier for a media item.
- `params.account_id: string` — the account identifier tag.

**Returns:** a [`Video`](#the-video-object).

```js
const video = await client.stream.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(video.uid);
```

### Initiate video uploads using TUS

`client.stream.create(params, options?): void`

**POST** `/accounts/{account_id}/stream`

Initiates a video upload using the TUS protocol. On success, the server responds with status code 201 (created) and includes a `location` header indicating where the content should be uploaded. Refer to [tus.io](https://tus.io) for protocol details.

**Parameters** (`StreamCreateParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `tusResumable` | `"1.0.0"` | **Required.** Header param: TUS protocol version; must be included in every upload request. Only 1.0.0 is supported. |
| `uploadLength` | `number` | **Required.** Header param: size of the entire upload in bytes (non-negative integer). |
| `direct_user?` | `boolean` | Query param: provisions a URL to let end users upload videos directly without exposing your API token. |
| `uploadCreator?` | `string` | Header param: a user-defined identifier for the media creator. |
| `uploadMetadata?` | `string` | Header param: comma-separated key-value pairs per the TUS spec; values are Base64-encoded. Supported keys: `name`, `requiresignedurls`, `allowedorigins`, `thumbnailtimestamppct`, `watermark`, `scheduleddeletion`, `maxdurationseconds`. |

```js
await client.stream.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  'Tus-Resumable': '1.0.0',
  'Upload-Length': 0,
});
```

### Edit video details

`client.stream.edit(identifier, params, options?): Video`

**POST** `/accounts/{account_id}/stream/{identifier}`

Edit details for a single video.

**Parameters** (`StreamEditParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display the video. Use `*` for wildcard subdomains. Empty arrays allow any origin. |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `maxDurationSeconds?` | `number` | Maximum duration in seconds for a video upload. Can be set before upload to limit duration; uploads exceeding it fail during processing. `-1` means unknown. |
| `meta?` | `unknown` | A user-modifiable key-value store referencing other systems of record. |
| `publicDetails?` | object | Public details: `channel_link`, `logo`, `share_link`, `title` (all `string \| null`). |
| `requireSignedURLs?` | `boolean` | When `true`, a signed token must be generated with a signing key to view the video. |
| `scheduledDeletion?` | `string` | Date and time at which the video will be deleted. Omit for no change; `null` removes an existing schedule. Must be at least 30 days from upload time. |
| `thumbnailTimestampPct?` | `number` | Thumbnail timestamp as a percentage of the video's duration (desired second ÷ total duration). Defaults to 0s. |
| `uid?` | `string` | The unique identifier for the video; can be used to verify the video being updated. |
| `uploadExpiry?` | `string` | Date and time when the upload URL is no longer valid for direct user uploads. |

**Returns:** the updated [`Video`](#the-video-object).

```js
const video = await client.stream.edit('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(video.uid);
```

### Delete video

`client.stream.delete(identifier, params, options?): void`

**DELETE** `/accounts/{account_id}/stream/{identifier}`

Deletes a video and its copies from Cloudflare Stream.

```js
await client.stream.delete('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Audio Tracks

The `Audio` object:

| Field | Type | Description |
| --- | --- | --- |
| `default?` | `boolean` | Whether the audio track plays by default in a player. |
| `label?` | `string` | Uniquely identifies the track amongst other audio track labels for the video. |
| `status?` | enum | Processing status: `queued`, `ready`, `error`. |
| `uid?` | `string` | A Cloudflare-generated unique identifier for a media item. |

### List additional audio tracks on a video

`client.stream.audioTracks.get(identifier, params, options?): AudioTrackGetResponse`

**GET** `/accounts/{account_id}/stream/{identifier}/audio`

Lists additional audio tracks on a video. Note: this API will not return information for audio attached to the video upload.

**Returns:** `{ audio?: Array<Audio> }`.

```js
const audioTrack = await client.stream.audioTracks.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(audioTrack.audio);
```

### Edit additional audio tracks on a video

`client.stream.audioTracks.edit(identifier, audioIdentifier, params, options?): Audio`

**PATCH** `/accounts/{account_id}/stream/{identifier}/audio/{audio_identifier}`

Edits additional audio tracks on a video. Setting a track's default status to `true` marks all other audio tracks on the video as non-default.

**Parameters:** `account_id` (required), `_default?: boolean`, `label?: string`.

```js
const audio = await client.stream.audioTracks.edit(
  'ea95132c15732412d22c1476fa83f27a',
  'ea95132c15732412d22c1476fa83f27a',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
);
```

### Delete additional audio tracks on a video

`client.stream.audioTracks.delete(identifier, audioIdentifier, params, options?): string`

**DELETE** `/accounts/{account_id}/stream/{identifier}/audio/{audio_identifier}`

Deletes additional audio tracks on a video. Deleting a default audio track is not allowed — assign another audio track as default prior to deletion.

```js
const result = await client.stream.audioTracks.delete(
  'ea95132c15732412d22c1476fa83f27a',
  'ea95132c15732412d22c1476fa83f27a',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
); // "ok"
```

### Add audio tracks to a video

`client.stream.audioTracks.copy(identifier, params, options?): Audio`

**POST** `/accounts/{account_id}/stream/{identifier}/audio/copy`

Adds an additional audio track to a video using the provided audio track URL.

**Parameters:**

- `account_id: string` — **required**.
- `label: string` — **required.** Uniquely identifies the track amongst other audio track labels.
- `url?: string` — an audio track URL. The server must be publicly routable and support `HTTP HEAD` requests and `HTTP GET` range requests, and should respond to `HEAD` with a `content-range` header including the file size.

```js
const audio = await client.stream.audioTracks.copy('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  label: 'director commentary',
});
```

---

## Storage Usage

`client.stream.videos.storageUsage(params, options?): VideoStorageUsageResponse`

**GET** `/accounts/{account_id}/stream/storage-usage`

Returns information about an account's storage use.

**Parameters:** `account_id` (required), `creator?: string` (query param filtering by media creator).

**Returns:**

| Field | Type | Description |
| --- | --- | --- |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `totalStorageMinutes?` | `number` | Total minutes of video content stored (may contain decimals). |
| `totalStorageMinutesLimit?` | `number` | The storage capacity allotted for the account. |
| `videoCount?` | `number` | The total count of videos associated with the account. |

```js
const response = await client.stream.videos.storageUsage({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(response.videoCount);
```

---

## Clip

`client.stream.clip.create(params, options?): Video`

**POST** `/accounts/{account_id}/stream/clip`

Clips a video based on the specified start and end times provided in seconds.

**Parameters** (`ClipCreateParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `clippedFromVideoUID` | `string` | **Required.** The unique video identifier (UID) of the source. |
| `endTimeSeconds` | `number` | **Required.** End time for the clip in seconds. |
| `startTimeSeconds` | `number` | **Required.** Start time for the clip in seconds. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display the video. |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `input?` | `string` | A video's URL. Preferred over `url`. |
| `meta?` | `unknown` | User-modifiable key-value store. |
| `name?` | `string` | A name for the video. |
| `requireSignedURLs?` | `boolean` | Require signed tokens for viewing. |
| `scheduledDeletion?` | `string` | Scheduled deletion date/time (min 30 days from upload). |
| `thumbnailTimestampPct?` | `number` | Thumbnail timestamp as a percentage of duration. |
| `url?` | `string` | A video's URL (legacy field, use `input` instead). |
| `watermark?` | `{ uid?: string }` | Watermark profile to apply. |

**Returns:** the new clip as a [`Video`](#the-video-object) (its `clippedFrom` field references the source video).

```js
const video = await client.stream.clip.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  clippedFromVideoUID: '023e105f4ecef8ad9ca31a8372d0c353',
  endTimeSeconds: 0,
  startTimeSeconds: 0,
});
```

---

## Copy (upload from URL)

`client.stream.copy.create(params, options?): Video`

**POST** `/accounts/{account_id}/stream/copy`

Uploads a video to Stream from a provided URL.

**Parameters** (`CopyCreateParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `input?` | `string` | A video's URL. The server must be publicly routable and support `HTTP HEAD` requests and `HTTP GET` range requests, and should respond to `HEAD` with a `content-range` header including the file size. Preferred over `url`. |
| `url?` | `string` | Same requirements as `input`; deprecated in favor of `input`. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display the video. |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `meta?` | `unknown` | User-modifiable key-value store. |
| `name?` | `string` | A video's name. Used for legacy compatibility. |
| `requireSignedURLs?` | `boolean` | Require signed tokens for viewing. |
| `scheduledDeletion?` | `string` | Scheduled deletion date/time (min 30 days from upload). |
| `thumbnailTimestampPct?` | `number` | Thumbnail timestamp as a percentage of duration. |
| `watermark?` | `{ uid?: string }` | Watermark profile to apply. |
| `uploadCreator?` | `string` | Header param: a user-defined identifier for the media creator. |

**Returns:** a [`Video`](#the-video-object).

```js
const video = await client.stream.copy.create({ account_id: '023e105f4ecef8ad9ca31a8372d0c353' });
```

---

## Direct Upload

`client.stream.directUpload.create(params, options?): DirectUploadCreateResponse`

**POST** `/accounts/{account_id}/stream/direct_upload`

Creates a direct upload that allows video uploads without an API key — ideal for letting end users upload from the browser.

**Parameters** (`DirectUploadCreateParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `maxDurationSeconds` | `number` | **Required.** Maximum duration in seconds for the upload; uploads exceeding it fail during processing. `-1` means unknown. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display the video. |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `expiry?` | `string` | Date and time after upload when videos will not be accepted. |
| `meta?` | `unknown` | User-modifiable key-value store. |
| `requireSignedURLs?` | `boolean` | Require signed tokens for viewing. |
| `scheduledDeletion?` | `string` | Scheduled deletion date/time (min 30 days from upload). |
| `thumbnailTimestampPct?` | `number` | Thumbnail timestamp as a percentage of duration. |
| `watermark?` | `{ uid?: string }` | Watermark profile to apply. |
| `uploadCreator?` | `string` | Header param: a user-defined identifier for the media creator. |

**Returns:**

| Field | Type | Description |
| --- | --- | --- |
| `uid?` | `string` | A Cloudflare-generated unique identifier for the media item. |
| `uploadURL?` | `string` | The URL an unauthenticated upload can use for a single `HTTP POST multipart/form-data` request. |
| `scheduledDeletion?` | `string` | Scheduled deletion date/time, if set. |
| `watermark?` | `Watermark` | The applied watermark profile, if any. |

```js
const directUpload = await client.stream.directUpload.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  maxDurationSeconds: 1,
});

console.log(directUpload.uploadURL);
```

---

## Signing Keys

Signing keys are created, used, and deleted independently of videos, and every key can sign any video.

### List signing keys

`client.stream.keys.get(params, options?): SinglePage<KeyGetResponse>`

**GET** `/accounts/{account_id}/stream/keys`

Lists the key ID and creation date/time for each signing key.

**Returns** (per item): `id?: string` (identifier), `created?: string`, `key_id?: string` (the unique identifier for the signing key).

```js
for await (const key of client.stream.keys.get({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
})) {
  console.log(key.key_id);
}
```

### Create signing keys

`client.stream.keys.create(params, options?): Keys`

**POST** `/accounts/{account_id}/stream/keys`

Creates an RSA private key in PEM and JWK formats. **Key files are only displayed once after creation** — store them securely.

**Parameters:** `account_id` (required), `body: unknown` (required; pass `{}`).

**Returns:** `id?`, `created?`, `jwk?` (the signing key in JWK format), `pem?` (the signing key in PEM format).

```js
const keys = await client.stream.keys.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  body: {},
});

console.log(keys.pem); // shown only once
```

### Delete signing keys

`client.stream.keys.delete(identifier, params, options?): string`

**DELETE** `/accounts/{account_id}/stream/keys/{identifier}`

Deletes signing keys and revokes all signed URLs generated with the key.

```js
await client.stream.keys.delete('023e105f4ecef8ad9ca31a8372d0c353', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Live Inputs

The `LiveInput` object:

| Field | Type | Description |
| --- | --- | --- |
| `uid?` | `string` | A unique identifier for a live input. |
| `created?` / `modified?` | `string` | Creation / last-modification timestamps. |
| `deleteRecordingAfterDays?` | `number` | Days after which recordings are deleted. When a stream completes and the recording is ready, this computes a scheduled deletion date. Omit for no change; `null` removes an existing schedule. |
| `enabled?` | `boolean` | Whether the live input can accept streams. |
| `keysRotatedAt?` | `string \| null` | When the input's keys were last rotated; omitted if never rotated. |
| `meta?` | `unknown` | User-modifiable key-value store. |
| `preferLowLatency?` | `boolean` | Deliver via Low-Latency HLS (LL-HLS), reducing glass-to-glass latency at the cost of reduced player compatibility. |
| `recording?` | object | Recording behavior (see below). |
| `rtmps?` / `rtmpsPlayback?` | object | RTMPS ingest / playback: `streamKey?`, `url?`. |
| `srt?` / `srtPlayback?` | object | SRT ingest / playback: `passphrase?`, `streamId?`, `url?`. |
| `webRTC?` / `webRTCPlayback?` | object | WebRTC ingest / playback: `url?`. |
| `status?` | enum \| null | Connection status: `connected`, `reconnected`, `reconnecting`, `client_disconnect`, `ttl_exceeded`, `failed_to_connect`, `failed_to_reconnect`, `new_configuration_accepted`. |

The `recording` object records the input to a Cloudflare Stream video. In most cases the video is initially viewable as live and transitions to on-demand after a condition is satisfied:

| Field | Type | Description |
| --- | --- | --- |
| `mode?` | `"off" \| "automatic"` | `off` prevents recording; `automatic` records and transitions to on-demand after Stream Live stops receiving input. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display videos created with this input. |
| `hideLiveViewerCount?` | `boolean` | Disables reporting the number of live viewers. |
| `requireSignedURLs?` | `boolean` | Enforces access controls on videos (and recordings) using this live input. |
| `timeoutSeconds?` | `number` | Wait time before an `automatic`-mode recording transitions from live to on-demand. `0` (platform default) is recommended for most use cases. |

### List live inputs

`client.stream.liveInputs.list(params, options?): LiveInputListResponse`

**GET** `/accounts/{account_id}/stream/live_inputs`

Lists the live inputs created for an account. To get the credentials needed to stream to a specific live input, request a single live input.

**Parameters:** `account_id` (required), `include_counts?: boolean`.

**Returns:** `{ liveInputs?: Array<LiveInput>, range?: number, total?: number }` (list items include only `created`, `deleteRecordingAfterDays`, `enabled`, `meta`, `modified`, `uid`).

```js
const liveInputs = await client.stream.liveInputs.list({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Retrieve a live input

`client.stream.liveInputs.get(liveInputIdentifier, params, options?): LiveInput`

**GET** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}`

Retrieves details of an existing live input, including ingest credentials (RTMPS/SRT/WebRTC).

```js
const liveInput = await client.stream.liveInputs.get('66be4bf738797e01e1fca35a7bdecdcd', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(liveInput.rtmps.url, liveInput.rtmps.streamKey);
```

### Create a live input

`client.stream.liveInputs.create(params, options?): LiveInput`

**POST** `/accounts/{account_id}/stream/live_inputs`

Creates a live input and returns credentials that you or your users can use to stream live video to Cloudflare Stream.

**Parameters:** `account_id` (required), plus optional `defaultCreator?: string` (sets the creator ID associated with this live input), `deleteRecordingAfterDays?`, `enabled?`, `meta?`, `preferLowLatency?`, `recording?` (as above).

```js
const liveInput = await client.stream.liveInputs.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Update a live input

`client.stream.liveInputs.update(liveInputIdentifier, params, options?): LiveInput`

**PUT** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}`

Updates a specified live input. Accepts the same body fields as create.

```js
const liveInput = await client.stream.liveInputs.update('66be4bf738797e01e1fca35a7bdecdcd', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Delete a live input

`client.stream.liveInputs.delete(liveInputIdentifier, params, options?): void`

**DELETE** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}`

Prevents a live input from being streamed to and makes it inaccessible to any future API calls.

```js
await client.stream.liveInputs.delete('66be4bf738797e01e1fca35a7bdecdcd', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Outputs (simulcasting)

Outputs let you simulcast or restream live video to other RTMP or SRT destinations (like YouTube and Twitch). Outputs are always linked to a specific live input — one live input can have many outputs.

The `Output` object:

| Field | Type | Description |
| --- | --- | --- |
| `enabled?` | `boolean` | When enabled, live video streamed to the associated live input is sent to the output URL. When disabled, it is not — even while streaming. Use this to control precisely when you start and stop simulcasting. |
| `streamKey?` | `string` | The streamKey used to authenticate against an output's target. |
| `uid?` | `string` | A unique identifier for the output. |
| `url?` | `string` | The URL an output uses to restream. |

### List outputs

`client.stream.liveInputs.outputs.list(liveInputIdentifier, params, options?): SinglePage<Output>`

**GET** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}/outputs`

```js
for await (const output of client.stream.liveInputs.outputs.list(
  '66be4bf738797e01e1fca35a7bdecdcd',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
)) {
  console.log(output.uid);
}
```

### Create an output

`client.stream.liveInputs.outputs.create(liveInputIdentifier, params, options?): Output`

**POST** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}/outputs`

**Parameters:** `account_id` (required), `streamKey: string` (**required**), `url: string` (**required**), `enabled?: boolean`.

```js
const output = await client.stream.liveInputs.outputs.create('66be4bf738797e01e1fca35a7bdecdcd', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  streamKey: 'uzya-f19y-g2g9-a2ee-51j2',
  url: 'rtmp://a.rtmp.youtube.com/live2',
});
```

### Update an output

`client.stream.liveInputs.outputs.update(liveInputIdentifier, outputIdentifier, params, options?): Output`

**PUT** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}/outputs/{output_identifier}`

Updates the state of an output. **Parameters:** `account_id` (required), `enabled: boolean` (**required**).

```js
const output = await client.stream.liveInputs.outputs.update(
  '66be4bf738797e01e1fca35a7bdecdcd',
  'baea4d9c515887b80289d5c33cf01145',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353', enabled: true },
);
```

### Delete an output

`client.stream.liveInputs.outputs.delete(liveInputIdentifier, outputIdentifier, params, options?): void`

**DELETE** `/accounts/{account_id}/stream/live_inputs/{live_input_identifier}/outputs/{output_identifier}`

Deletes an output and removes it from the associated live input.

```js
await client.stream.liveInputs.outputs.delete(
  '66be4bf738797e01e1fca35a7bdecdcd',
  'baea4d9c515887b80289d5c33cf01145',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
);
```

---

## Watermarks

The `Watermark` object:

| Field | Type | Description |
| --- | --- | --- |
| `uid?` | `string` | The unique identifier for a watermark profile. |
| `created?` | `string` | When the watermark profile was created. |
| `downloadedFrom?` | `string` | Source URL for a downloaded image; `null` if created via direct upload. |
| `name?` | `string` | A short description of the watermark profile. |
| `opacity?` | `number` | Translucency: `0.0` fully transparent to `1.0` fully opaque. If the image is already semi-transparent, `1.0` will not make it fully opaque. |
| `padding?` | `number` | Whitespace between the adjacent edges (determined by position) of the video and the image: `0.0` none, `1.0` fully padded. |
| `position?` | `string` | `upperRight`, `upperLeft`, `lowerLeft`, `lowerRight`, or `center`. Note `center` ignores `padding`. |
| `scale?` | `number` | Image size relative to the video (adapts to horizontal/vertical automatically): `0.0` no scaling, `1.0` fills the entire video. |
| `size?` | `number` | The size of the image in bytes. |
| `height?` / `width?` | `number` | Image dimensions in pixels. |

### List watermark profiles

`client.stream.watermarks.list(params, options?): SinglePage<Watermark>`

**GET** `/accounts/{account_id}/stream/watermarks`

```js
for await (const watermark of client.stream.watermarks.list({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
})) {
  console.log(watermark.uid);
}
```

### Watermark profile details

`client.stream.watermarks.get(identifier, params, options?): Watermark`

**GET** `/accounts/{account_id}/stream/watermarks/{identifier}`

```js
const watermark = await client.stream.watermarks.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Create watermark profiles via basic upload

`client.stream.watermarks.create(params, options?): Watermark`

**POST** `/accounts/{account_id}/stream/watermarks`

Creates watermark profiles using a single `HTTP POST multipart/form-data` request.

**Parameters:** `account_id` (required), plus optional `name?`, `opacity?`, `padding?`, `position?`, `scale?` (as in the table above) and `url?: string` — URL of the watermark image to copy.

```js
const watermark = await client.stream.watermarks.create({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Delete watermark profiles

`client.stream.watermarks.delete(identifier, params, options?): string`

**DELETE** `/accounts/{account_id}/stream/watermarks/{identifier}`

```js
await client.stream.watermarks.delete('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Webhooks

Webhook responses share these fields: `modified?` (last modified date/time), `notification_url?` / `notificationUrl?` (the URL where webhooks will be sent), and `secret?` (the secret used to verify webhook signatures).

### View webhooks

`client.stream.webhooks.get(params, options?): WebhookGetResponse`

**GET** `/accounts/{account_id}/stream/webhook`

```js
const webhook = await client.stream.webhooks.get({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Create webhooks

`client.stream.webhooks.update(params, options?): WebhookUpdateResponse`

**PUT** `/accounts/{account_id}/stream/webhook`

Creates a webhook notification. **Parameters:** `account_id` (required), `notification_url?` or `notificationUrl?` — the URL where webhooks will be sent.

```js
const webhook = await client.stream.webhooks.update({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
  notificationUrl: 'https://example.com',
});
```

### Delete webhooks

`client.stream.webhooks.delete(params, options?): string`

**DELETE** `/accounts/{account_id}/stream/webhook`

```js
await client.stream.webhooks.delete({
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Captions

The `Caption` object:

| Field | Type | Description |
| --- | --- | --- |
| `generated?` | `boolean` | Whether the caption was generated via AI. |
| `label?` | `string` | The language label displayed in the native language to users. |
| `language?` | `string` | The language tag in BCP 47 format. |
| `status?` | enum | Status of a generated caption: `ready`, `inprogress`, `error`. |

### List captions or subtitles

`client.stream.captions.get(identifier, params, options?): SinglePage<Caption>`

**GET** `/accounts/{account_id}/stream/{identifier}/captions`

Lists the available captions or subtitles for a specific video.

```js
for await (const caption of client.stream.captions.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
})) {
  console.log(caption.language, caption.status);
}
```

### Get captions for a language

`client.stream.captions.language.get(identifier, language, params, options?): Caption`

**GET** `/accounts/{account_id}/stream/{identifier}/captions/{language}`

```js
const caption = await client.stream.captions.language.get(
  'ea95132c15732412d22c1476fa83f27a',
  'tr',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
);
```

### Generate captions via AI

`client.stream.captions.language.create(identifier, language, params, options?): Caption`

**POST** `/accounts/{account_id}/stream/{identifier}/captions/{language}/generate`

Generates captions or subtitles for the provided language via AI.

```js
const caption = await client.stream.captions.language.create(
  'ea95132c15732412d22c1476fa83f27a',
  'tr',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
);
```

### Upload captions or subtitles

`client.stream.captions.language.update(identifier, language, params, options?): Caption`

**PUT** `/accounts/{account_id}/stream/{identifier}/captions/{language}`

Uploads a caption or subtitle file for a specific BCP 47 language. One caption or subtitle file per language is allowed.

**Parameters:** `account_id` (required), `file: string` (**required** — the WebVTT file containing the caption or subtitle content).

```js
const caption = await client.stream.captions.language.update(
  'ea95132c15732412d22c1476fa83f27a',
  'tr',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353', file: '@/Users/kyle/Desktop/tr.vtt' },
);
```

### Delete captions or subtitles

`client.stream.captions.language.delete(identifier, language, params, options?): string`

**DELETE** `/accounts/{account_id}/stream/{identifier}/captions/{language}`

Removes the captions or subtitles from a video.

```js
await client.stream.captions.language.delete('ea95132c15732412d22c1476fa83f27a', 'tr', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Return WebVTT captions for a language

`client.stream.captions.language.vtt.get(identifier, language, params, options?): string`

**GET** `/accounts/{account_id}/stream/{identifier}/captions/{language}/vtt`

Returns the raw WebVTT captions for the provided language.

```js
const vtt = await client.stream.captions.language.vtt.get(
  'ea95132c15732412d22c1476fa83f27a',
  'tr',
  { account_id: '023e105f4ecef8ad9ca31a8372d0c353' },
);
```

---

## Downloads

Download responses are objects keyed by download type — `default` (the video download) and `audio` (audio-only) — where each key is present only if that download type has been created. Each entry contains:

| Field | Type | Description |
| --- | --- | --- |
| `percentComplete` | `number` | Progress as a percentage between 0 and 100. |
| `status` | enum | `ready`, `inprogress`, or `error`. |
| `url?` | `string` | The URL to access the generated download. |

### List downloads

`client.stream.downloads.get(identifier, params, options?): DownloadGetResponse`

**GET** `/accounts/{account_id}/stream/{identifier}/downloads`

```js
const download = await client.stream.downloads.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(download.default?.url);
```

### Create downloads

`client.stream.downloads.create(identifier, params, options?): DownloadCreateResponse`

**POST** `/accounts/{account_id}/stream/{identifier}/downloads`

Creates a download for a video when a video is ready to view. Use `/downloads/{download_type}` instead for type-specific downloads; available types are `default` and `audio`.

```js
const download = await client.stream.downloads.create('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

### Delete downloads

`client.stream.downloads.delete(identifier, params, options?): string`

**DELETE** `/accounts/{account_id}/stream/{identifier}/downloads`

Deletes the downloads for a video. Use `/downloads/{download_type}` instead for type-specific deletion.

```js
await client.stream.downloads.delete('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});
```

---

## Embed

`client.stream.embed.get(identifier, params, options?): string`

**GET** `/accounts/{account_id}/stream/{identifier}/embed`

Fetches an HTML code snippet to embed a video in a web page delivered through Cloudflare. On success, returns an HTML fragment for use on web pages to display a video. On failure, returns a JSON response body.

```js
const embed = await client.stream.embed.get('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(embed);
```

---

## Token (signed URLs)

`client.stream.token.create(identifier, params, options?): TokenCreateResponse`

**POST** `/accounts/{account_id}/stream/{identifier}/token`

Creates a signed URL token for a video. If a body is not provided in the request, a token is created with default values.

**Parameters** (`TokenCreateParams`):

| Field | Type | Description |
| --- | --- | --- |
| `account_id` | `string` | **Required.** Path param: the account identifier tag. |
| `id?` | `string` | The optional ID of a Stream signing key. If present, `pem` is also required. |
| `pem?` | `string` | The optional base64-encoded private key in PEM format associated with a Stream signing key. If present, `id` is also required. |
| `accessRules?` | `Array<AccessRule>` | Optional access rule constraints on the token (see below). |
| `downloadable?` | `boolean` | Enables using signed tokens to access MP4 download links for a video. |
| `exp?` | `number` | Unix epoch timestamp after which the token is not accepted. Maximum 24 hours from issuing time; defaults to one hour after issuing. |
| `nbf?` | `number` | Unix epoch timestamp before which the token is not accepted. Defaults to one hour before issuing. |
| `flags?` | `{ original?: boolean }` | Optional flags; `original` returns the original video without transformations. |

`AccessRule` — access can be blocked or allowed based on an IP, IP range, or country. Rules are evaluated from first to last; when a rule matches, its action is applied and no further rules are evaluated:

| Field | Type | Description |
| --- | --- | --- |
| `action?` | `"allow" \| "block"` | Action when a request matches. `block` prevents views for matching viewers. |
| `country?` | `Array<string>` | 2-letter country codes in ISO 3166-1 Alpha-2 format. |
| `ip?` | `Array<string>` | IPv4 or IPv6 addresses or CIDRs. |
| `type?` | `"any" \| "ip.src" \| "ip.geoip.country"` | Rule type. `any` matches all requests and can be used as a wildcard to apply default actions after other rules. |

**Returns:** `{ token?: string }` — the signed token used with the signed URLs feature.

```js
const token = await client.stream.token.create('ea95132c15732412d22c1476fa83f27a', {
  account_id: '023e105f4ecef8ad9ca31a8372d0c353',
});

console.log(token.token);
```

---

## The Video object

The `Video` object is returned by list, get, edit, clip, and copy operations.

| Field | Type | Description |
| --- | --- | --- |
| `uid?` | `string` | A Cloudflare-generated unique identifier for a media item. |
| `allowedOrigins?` | `Array<string>` | Origins allowed to display the video. Use `*` for wildcard subdomains; an empty array allows any origin. |
| `clippedFrom?` | `string` | Unique identifier of the source video this video was clipped from. |
| `created?` | `string` | When the media item was created. |
| `creator?` | `string` | A user-defined identifier for the media creator. |
| `duration?` | `number` | Duration in seconds. `-1` means unknown; becomes available after upload and before the video is ready. |
| `input?` | `{ height?, width? }` | Input dimensions in pixels. `-1` means unknown; available after upload and before ready. |
| `liveInput?` | `string` | The live input ID used to upload a video with Stream Live. |
| `maxDurationSeconds?` | `number` | Maximum upload duration in seconds; uploads exceeding it fail during processing. `-1` means unknown. |
| `maxSizeBytes?` | `number` | The maximum size in bytes for the video upload. |
| `meta?` | `unknown` | User-modifiable key-value store referencing other systems of record. |
| `modified?` | `string` | When the media item was last modified. |
| `playback?` | `{ hls?, dash? }` | HLS manifest and DASH Media Presentation Description URLs. |
| `preview?` | `string` | The video's preview page URI. Omitted until encoding is complete. |
| `publicDetails?` | object | Public details: `title`, `share_link`, `channel_link`, `logo` (all `string \| null`) and `media_id?: number`. |
| `readyToStream?` | `boolean` | Whether the video is playable. Empty if not ready or the live stream is still in progress. |
| `readyToStreamAt?` | `string` | When the video became playable. Empty if not ready or the live stream is still in progress. |
| `requireSignedURLs?` | `boolean` | When `true`, a signed token must be generated with a signing key to view the video. |
| `scheduledDeletion?` | `string` | When the video will be deleted. Omit for no change; `null` removes an existing schedule. Must be at least 30 days from upload time. |
| `size?` | `number` | The size of the media item in bytes. |
| `status?` | object | Detailed status (see below). |
| `thumbnail?` | `string` | The media item's thumbnail URI. Omitted until encoding is complete. |
| `thumbnailTimestampPct?` | `number` | Thumbnail timestamp as a percentage of duration (desired second ÷ total duration). Defaults to 0s. |
| `uploaded?` | `string` | When the media item was uploaded. |
| `uploadExpiry?` | `string` | When the upload URL is no longer valid for direct user uploads. |
| `watermark?` | `Watermark` | The applied watermark profile (see [Watermarks](#watermarks)). |

The `status` object specifies a detailed status for a video. If `state` is `inprogress` or `error`, the `step` field returns `encoding` or `manifest`:

| Field | Type | Description |
| --- | --- | --- |
| `state?` | enum | `pendingupload`, `downloading`, `queued`, `inprogress`, `ready`, `error`, or `live-inprogress`. |
| `pctComplete?` | `string` | Progress as a percentage between 0 and 100 (when `state` is `inprogress`). |
| `errorReasonCode?` | `string` | Why the video failed to encode (e.g. `ERR_NON_VIDEO`). Empty unless in an `error` state. Preferred for programmatic use. |
| `errorReasonText?` | `string` | Human-readable English error message. Empty unless in an `error` state. |

### Response envelope

All JSON endpoints wrap results in the standard Cloudflare envelope:

```json
{
  "errors": [],
  "messages": [],
  "success": true,
  "result": { "uid": "ea95132c15732412d22c1476fa83f27a", "...": "..." }
}
```

List endpoints additionally return `range` (items in this page) and `total` (total matching items) when counts are requested.
