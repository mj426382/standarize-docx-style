import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

/** Wpis cache podpisanych URL-i. */
interface CachedUrl {
  url: string;
  expiresAt: number;
}

/** Czas życia podpisanego URL-a (23h w sekundach) i bufor cache. */
const SIGNED_URL_TTL_SECONDS = 23 * 60 * 60;
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? '/app/uploads';

/**
 * Serwis storage z abstrakcją Backblaze B2 (S3-compatible) i fallbackiem na dysk lokalny.
 * Gdy zmienne B2 nie są ustawione, pliki zapisywane są lokalnie i serwowane przez /api/uploads.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3?: AWS.S3;
  private readonly bucket?: string;
  private readonly publicUrl?: string;
  private readonly urlCache = new Map<string, CachedUrl>();

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('B2_ENDPOINT');
    const bucket = this.config.get<string>('B2_BUCKET_NAME');
    const keyId = this.config.get<string>('B2_KEY_ID');
    const appKey = this.config.get<string>('B2_APPLICATION_KEY');

    if (endpoint && bucket && keyId && appKey) {
      this.bucket = bucket;
      this.publicUrl = this.config.get<string>('B2_PUBLIC_URL');
      this.s3 = new AWS.S3({
        endpoint,
        accessKeyId: keyId,
        secretAccessKey: appKey,
        region: this.config.get<string>('B2_REGION') ?? 'us-east-1',
        s3ForcePathStyle: true,
        signatureVersion: 'v4',
      });
      this.logger.log('StorageService: tryb B2 (S3) aktywny.');
    } else {
      this.logger.warn('StorageService: brak konfiguracji B2 - używam dysku lokalnego.');
    }
  }

  /** Czy działamy w trybie zdalnego storage (B2). */
  private get isRemote(): boolean {
    return Boolean(this.s3 && this.bucket);
  }

  /**
   * Zapisuje bufor pliku i zwraca jego klucz storage.
   * @param folder podkatalog logiczny np. `sources` lub `documents`.
   */
  async uploadFile(
    buffer: Buffer,
    name: string,
    mime: string,
    folder: string,
  ): Promise<string> {
    const key = `${folder}/${Date.now()}-${this.sanitizeName(name)}`;

    if (this.isRemote && this.s3 && this.bucket) {
      await this.s3
        .putObject({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mime })
        .promise();
      return key;
    }

    const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return key;
  }

  /**
   * Zwraca (i cache'uje na 23h) URL do pobrania pliku.
   * Dla storage lokalnego zwraca ścieżkę względną /api/uploads.
   */
  async getSignedUrl(key: string): Promise<string> {
    const cached = this.urlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    let url: string;
    if (this.isRemote && this.s3 && this.bucket) {
      url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: SIGNED_URL_TTL_SECONDS,
      });
    } else {
      url = `/api/uploads/${key}`;
    }

    this.urlCache.set(key, { url, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 });
    return url;
  }

  /** Pobiera zawartość pliku jako Buffer. */
  async getFileBuffer(key: string): Promise<Buffer> {
    if (this.isRemote && this.s3 && this.bucket) {
      const result = await this.s3.getObject({ Bucket: this.bucket, Key: key }).promise();
      return result.Body as Buffer;
    }
    return fs.readFile(path.join(LOCAL_UPLOAD_DIR, key));
  }

  /** Usuwa plik ze storage i czyści cache URL-a. */
  async deleteFile(key: string): Promise<void> {
    if (this.isRemote && this.s3 && this.bucket) {
      await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
    } else {
      await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key)).catch(() => undefined);
    }
    this.invalidateCachedUrl(key);
  }

  /** Usuwa wpis URL-a z cache. */
  invalidateCachedUrl(key: string): void {
    this.urlCache.delete(key);
  }

  /** Normalizuje nazwę pliku do bezpiecznego klucza. */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
