import { Region } from './region.model';
import { Mask } from './mask.model';

export class AnnotationFile {
    filename: string;
    size: number;
    masks: Mask[];
    regions: Region[];
}
