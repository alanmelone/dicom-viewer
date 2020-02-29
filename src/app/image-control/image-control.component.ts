import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';
import * as Hammer from 'hammerjs';
import { combineLatest } from 'rxjs';
import { AppService } from '../app.service';
import { AnnotationFile } from '../models/annotation-file.model';
import { Region } from '../models/region.model';
import { Mask } from '../models/mask.model';

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

@Component({
    selector: 'ia-image-control',
    templateUrl: './image-control.component.html',
    styleUrls: ['./image-control.component.scss']
})
export class ImageControlComponent implements OnInit, AfterViewInit {
    @ViewChild('dicomImage', { static: true })
    private dicomImage: any;

    public regions: Region[];
    public masks: Mask[] = [];

    private selectedRegionIds: number[] = [];
    private dicomFiles = ['2_1', '2_2'];
    private currentDicom = 0;

    private imageAnnotations = {};

    private mainLayerId: string;

    private currentLayerId: string;

    constructor(
        private appService: AppService
    ) { }

    ngOnInit(): void {
        this.dicomImage.nativeElement.addEventListener('cornerstoneimagerendered', (e) => {
            cornerstone.setToPixelCoordinateSystem(e.detail.enabledElement, e.detail.canvasContext);
            if (!this.imageAnnotations) {
                return;
            }

            const context = e.detail.canvasContext;

            this.regions = (this.imageAnnotations[Object.entries(this.imageAnnotations)[0][0]] as AnnotationFile).regions;
            this.regions.forEach((r, index) => {
                if (this.selectedRegionIds.includes(index)) {
                    const xCoords = r.shape_attributes.all_points_x;
                    const yCoords = r.shape_attributes.all_points_y;

                    context.beginPath();
                    context.moveTo(xCoords[0], yCoords[0]);
                    for (let i = 1; i < xCoords.length; i++) {
                        context.lineTo(xCoords[i], yCoords[i]);
                    }
                    context.closePath();
                    context.fillStyle = 'rgba(255, 0, 0, 0.4)'
                    context.fill();
                }
            })
        });

        this.appService.getAnnotationForDicom(this.dicomFiles[this.currentDicom])
            .subscribe(imageAnnotations => {
                Object.keys(imageAnnotations).forEach(key => {
                    if ((imageAnnotations[key] as AnnotationFile).masks) {
                        this.masks = (imageAnnotations[key] as AnnotationFile).masks;
                    }
                    return;
                });
                this.imageAnnotations = imageAnnotations
            });
    }

    ngAfterViewInit(): void {
        cornerstoneTools.init({
            showSVGCursors: true
        });

        cornerstone.enable(this.dicomImage.nativeElement);

        const layerImages$ = this.appService.fetchLayersImage(['test.png']);
        const loadImage$ = this.appService.fetchDicomImage(this.dicomFiles[this.currentDicom]);
        combineLatest(loadImage$, layerImages$).subscribe(([image, layer]) => {
            this.displayImage(image);

            const PanTool = cornerstoneTools.PanTool;
            const ZoomMouseWheelTool = cornerstoneTools.ZoomMouseWheelTool;
            cornerstoneTools.addTool(PanTool);
            cornerstoneTools.addTool(ZoomMouseWheelTool);
            cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
            cornerstoneTools.setToolActive('ZoomMouseWheel', { mouseButtonMask: 1 })
        });
    }

    changeRegion(event) {
        if (event.checked) {
            this.selectedRegionIds.push(event.source.value)
        } else {
            const indexOfElement = this.selectedRegionIds.findIndex(r => r === event.source.value);
            this.selectedRegionIds.splice(indexOfElement, 1);
        }

        this.redrawImage();
    }

    nextImage() {
        if (this.currentDicom === this.dicomFiles.length - 1) {
            this.currentDicom = 0;
        } else {
            this.currentDicom++;
        }

        this.changeImage();
    }

    previousImage() {
        if (this.currentDicom === 0) {
            this.currentDicom = this.dicomFiles.length - 1;
        } else {
            this.currentDicom--;
        }

        this.changeImage();
    }

    private changeImage() {
        this.selectedRegionIds = [];
        const loadImage$ = this.appService.fetchDicomImage(this.dicomFiles[this.currentDicom]);
        const annotations$ = this.appService.getAnnotationForDicom(this.dicomFiles[this.currentDicom]);
        combineLatest(annotations$, loadImage$).subscribe(([annotations, image]) => {
            this.imageAnnotations = annotations;
            this.displayImage(image);
        });
    }

    private displayImage(image) {

        if (this.mainLayerId) {
            cornerstone.setLayerImage(this.dicomImage.nativeElement, image, this.mainLayerId)
        } else {
            this.mainLayerId = cornerstone.addLayer(this.dicomImage.nativeElement, image);
        }
    }

    private redrawImage() {
        cornerstone.updateImage(this.dicomImage.nativeElement);
        cornerstone.draw(this.dicomImage.nativeElement);
    }
}