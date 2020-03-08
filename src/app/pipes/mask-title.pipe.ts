import { PipeTransform, Pipe } from '@angular/core';

@Pipe({ name: 'maskTitle' })
export class MaskTitlePipe implements PipeTransform {
    transform(value: any, ...args: any[]) {
        const regExp = new RegExp(/[\[a-z,A-Z,\s]+\]/);
        return regExp.exec(value)[0];
    }
}
