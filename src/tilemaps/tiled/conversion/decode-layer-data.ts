// Decodes a tile layer's gids: CSV arrays, and base64 strings, uncompressed
// or compressed with zlib or gzip. Not exported from the package.

import type {
  TiledTileBlockFile,
  TiledTileLayerFile,
} from '../file-data/tiled-file-data.js';

const maxGid = 0xffff_ffff;

const bytesPerGid = 4;

const decodeBase64 = (
  text: string,
  describe: string,
): Uint8Array<ArrayBuffer> => {
  let binary: string;

  try {
    binary = atob(text.trim());
  } catch (error) {
    throw new Error(`${describe}'s data isn't valid base64.`, {
      cause: error,
    });
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

/**
 * Decompresses a stream, reading no more than `maxBytes`, so a hostile file
 * can't inflate past what the layer's cells need.
 */
const decompress = async (
  bytes: Uint8Array<ArrayBuffer>,
  format: CompressionFormat,
  maxBytes: number,
  describe: string,
): Promise<Uint8Array> => {
  const reader = new ReadableStream<BufferSource>({
    start(controller): void {
      controller.enqueue(bytes);
      controller.close();
    },
  })
    .pipeThrough(new DecompressionStream(format))
    .getReader();
  const result = new Uint8Array(maxBytes);
  let length = 0;
  let tooLong = false;

  try {
    for (;;) {
      // A stream's chunks arrive one after another.
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (length + value.length > maxBytes) {
        tooLong = true;

        break;
      }

      result.set(value, length);
      length += value.length;
    }
  } catch (error) {
    throw new Error(`${describe}'s data isn't valid ${format} data.`, {
      cause: error,
    });
  }

  if (tooLong) {
    await reader.cancel();

    throw new Error(
      `${describe}'s data decompresses to more than the ${maxBytes} bytes its cells need.`,
    );
  }

  return result.subarray(0, length);
};

const readGids = (
  bytes: Uint8Array,
  cells: number,
  describe: string,
): Uint32Array => {
  if (bytes.length !== cells * bytesPerGid) {
    throw new Error(
      `${describe}'s data has ${bytes.length} bytes, but its ${cells} cells need ${cells * bytesPerGid}.`,
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const gids = new Uint32Array(cells);

  for (let index = 0; index < cells; index++) {
    gids[index] = view.getUint32(index * bytesPerGid, true);
  }

  return gids;
};

const readCsvGids = (
  data: readonly unknown[],
  cells: number,
  describe: string,
): Uint32Array => {
  if (data.length !== cells) {
    throw new Error(
      `${describe}'s data has ${data.length} gids, but it has ${cells} cells.`,
    );
  }

  const gids = new Uint32Array(cells);

  data.forEach((gid, index) => {
    if (
      typeof gid !== 'number' ||
      !Number.isInteger(gid) ||
      gid < 0 ||
      gid > maxGid
    ) {
      throw new Error(
        `${describe}'s data[${index}] must be a gid, a whole number from 0 to ${maxGid}, got ${JSON.stringify(gid)}.`,
      );
    }

    gids[index] = gid;
  });

  return gids;
};

const compressionFormats: Readonly<
  Record<Exclude<TiledTileLayerFile['compression'], ''>, CompressionFormat>
> = {
  zlib: 'deflate',
  gzip: 'gzip',
};

/**
 * Decodes the gids of a block of a tile layer.
 * @param block - The block: a finite layer, or a chunk.
 * @param layer - The layer, for its encoding and compression.
 * @param describe - Where the block is, for error messages.
 * @returns The block's `width * height` gids, row-major.
 * @throws An error if the data isn't valid for its encoding or compression,
 * or holds a different number of gids than the block has cells.
 */
export const decodeTiledBlockData = async (
  block: TiledTileBlockFile,
  layer: TiledTileLayerFile,
  describe: string,
): Promise<Uint32Array> => {
  const cells = block.width * block.height;
  const { data } = block;

  if (typeof data !== 'string') {
    return readCsvGids(data, cells, describe);
  }

  const bytes = decodeBase64(data, describe);

  if (layer.compression === '') {
    return readGids(bytes, cells, describe);
  }

  return readGids(
    await decompress(
      bytes,
      compressionFormats[layer.compression],
      cells * bytesPerGid,
      describe,
    ),
    cells,
    describe,
  );
};
