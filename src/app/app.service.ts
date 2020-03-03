import { Injectable } from '@angular/core';
import { Observable, from, Subscriber, of } from 'rxjs';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import * as cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import * as dicomParser from "dicom-parser";
import * as cornerstone from 'cornerstone-core'
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AnnotationFile } from './models/annotation-file.model';
import { createImage } from './helpers/load-image';

@Injectable({ providedIn: 'root' })
export class AppService {
    constructor(private httpClient: HttpClient) {
        cornerstoneWebImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        cornerstoneWADOImageLoader.webWorkerManager.initialize({
            webWorkerPath: '/assets/cornerstone/cornerstoneWADOImageLoaderWebWorker.js',
            taskConfiguration: {
                'decodeTask': {
                    codecsPath: '/assets/cornerstone/cornerstoneWADOImageLoaderCodecs.js'
                }
            }
        });
    }

    getAnnotationForDicom(filename: string) {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        })
        return this.httpClient.get<Map<string, AnnotationFile>>(`http://localhost:4200/assets/${filename}.json`, {headers: headers});
    }

    getFile(file: File) {
        const fileId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        return from(cornerstone.loadAndCacheImage(fileId));
    }

    getLayerImage(file: File) {
        const fileReader = new FileReader();

        return new Observable(subscriber => {
            fileReader.onload = () => {
                const layerImage = new Image();
                layerImage.onload = () => {
                    subscriber.next(createImage(layerImage, file.name));
                    subscriber.complete();
                }
                layerImage.src = fileReader.result as string;
            }

            fileReader.readAsDataURL(file);
        })
    }

    getAnnotationsFromFile(annotationFile) {
        if (!annotationFile) {
            return of({});
        }
        const fileReader = new FileReader();

        return new Observable(subscriber => {
            fileReader.onload = () => {
                subscriber.next(JSON.parse(fileReader.result as string));
                subscriber.complete();
            }

            fileReader.readAsText(annotationFile);
        });
    }
}