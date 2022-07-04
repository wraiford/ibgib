import { SVG_NAMESPACE } from '../types/svg';

export function ibSvg({
    width, height,
}: {
    width: number, height: number,
}): SVGElement {
    const lc = `[${ibSvg.name}]`;
    try {
        const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
        svg.setAttribute('width', `${width}`);
        svg.setAttribute('height', `${height}`);

        const defs: SVGDefsElement = document.createElementNS(SVG_NAMESPACE, 'defs');
        svg.append(defs);

        return svg;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function ibGetDefs({
    svg,
}: {
    svg: SVGElement,
}): SVGDefsElement {
    const lc = `[${ibGetDefs.name}]`;
    try {
        let defs: SVGDefsElement;
        svg.childNodes.forEach(x => {
            if (x.nodeName === 'defs') { defs = <SVGDefsElement>x; }
        });
        return defs ?? undefined;
    } catch (error) {
        debugger;
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function ibGroup({
    parent,
    x, y,
    width, height,
    style,
    fill,
    opacity,
    stroke,
    strokeWidth,
}: {
    /**
     * If provided, will append to the svg
     */
    parent?: SVGElement,
    x: number, y: number,
    width: number, height: number,
    style?: string,
    fill?: string,
    opacity?: number,
    stroke?: string,
    strokeWidth?: string,
}): SVGGElement {
    const lc = `[${ibGroup.name}]`;
    try {
        stroke = stroke || 'black';
        strokeWidth = strokeWidth || '1px';
        if (!style) {
            style = `stroke:${stroke};stroke-width:${strokeWidth}`;
            if (fill) { style += `;fill:${fill}`; }
        }

        const group = document.createElementNS(SVG_NAMESPACE, 'g');
        group.setAttribute('x', `${x}`);
        group.setAttribute('y', `${y}`);
        group.setAttribute('transform', `translate(${x},${y})`);
        group.setAttribute('width', `${width}`);
        group.setAttribute('height', `${height}`);
        if (opacity || opacity == 0) { group.setAttribute('opacity', opacity.toString()); }
        group.setAttribute('style', style);

        if (parent) { parent.appendChild(group); }

        return group;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function ibCircle({
    parent,
    id,
    cx, cy,
    r,
    style,
    fill,
    opacity,
    stroke,
    strokeWidth,
    picSrcFn,
}: {
    /**
     * If provided, will append created element to this
     */
    parent?: SVGElement,
    id?: string,
    cx: number, cy: number,
    r: number,
    style?: string,
    fill?: string,
    opacity?: number,
    stroke?: string,
    strokeWidth?: string,
    picSrcFn?: () => string,
    commentTextFn?: () => string,
}): SVGCircleElement {
    const lc = `[${ibCircle.name}]`;
    try {
        stroke = stroke || 'black';
        strokeWidth = strokeWidth || '1px';
        if (!style) {
            style = `stroke:${stroke};stroke-width:${strokeWidth}`;
        }

        const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
        circle.setAttribute('cx', `${cx}`);
        circle.setAttribute('cy', `${cy}`);
        circle.setAttribute('r', `${r}`);
        if (fill) { circle.setAttribute('fill', fill); }
        if (opacity || opacity == 0) { circle.setAttribute('opacity', opacity.toString()); }
        circle.setAttribute('style', style);

        if (picSrcFn) {
            const widthHeight = `${2 * r}`;
            let defs: SVGDefsElement;
            parent.childNodes.forEach((child: any) => {
                if (child.nodeName === 'defs') { defs = child; }
            });
            if (!defs) {
                defs = document.createElementNS(SVG_NAMESPACE, 'defs');
                parent.appendChild(defs);
            }




            let pattern: SVGPatternElement = document.createElementNS(SVG_NAMESPACE, 'pattern');
            if (!id) { throw new Error(`id required for pics (E: a179adeb6d2998af0ebea19b7a81b722)`); }
            pattern.setAttribute('id', `id_${id}`);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', widthHeight);
            pattern.setAttribute('height', widthHeight);
            // pattern.setAttribute('patternUnits', 'objectBoundingBox');
            // pattern.setAttribute('width', '1');
            // pattern.setAttribute('height', '1');
            defs.appendChild(pattern);

            let image: SVGImageElement = document.createElementNS(SVG_NAMESPACE, 'image');
            let src = picSrcFn();
            image.setAttribute('href', src);
            image.setAttribute('x', '0');
            image.setAttribute('y', '0');
            image.setAttribute('width', widthHeight);
            image.setAttribute('height', widthHeight);
            pattern.appendChild(image);

            // fill="url(#image)"
            circle.setAttribute('fill', `url(#id_${id})`);
            // circle.appendChild(image);
            // https://blog.idrsolutions.com/how-to-embed-base64-images-in-svg/
        }

        if (parent) { parent.appendChild(circle); }

        return circle;
    } catch (error) {
        debugger;
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function ibLine({
    parent,
    x1y1, x2y2,
    style,
    opacity,
    stroke,
    strokeWidth,
}: {
    /**
     * If provided, will append created element to this
     */
    parent?: SVGElement,
    x1y1: [number, number],
    x2y2: [number, number],
    style?: string,
    opacity?: number,
    stroke?: string,
    strokeWidth?: string,
}): SVGLineElement {
    const lc = `[${ibLine.name}]`;
    try {
        stroke = stroke || 'black';
        strokeWidth = strokeWidth || '1px';
        if (!style) {
            style = `stroke:${stroke};stroke-width:${strokeWidth}`;
        }

        const line = document.createElementNS(SVG_NAMESPACE, 'line');
        line.setAttribute('x1', `${x1y1[0]}`);
        line.setAttribute('y1', `${x1y1[1]}`);
        line.setAttribute('x2', `${x2y2[0]}`);
        line.setAttribute('y2', `${x2y2[1]}`);
        if (opacity || opacity == 0) { line.setAttribute('opacity', opacity.toString()); }
        line.setAttribute('style', style);

        if (parent) { parent.appendChild(line); }

        return line;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function ibAnimate({

}): SVGAnimateElement {
    return undefined;
}
export function ibAnimateMotion({

}): SVGAnimateMotionElement {
    return undefined;
}