export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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

        return svg;
    } catch (error) {
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
    cx, cy,
    r,
    style,
    fill,
    opacity,
    stroke,
    strokeWidth,
}: {
    /**
     * If provided, will append created element to this
     */
    parent?: SVGElement,
    cx: number, cy: number,
    r: number,
    style?: string,
    fill?: string,
    opacity?: number,
    stroke?: string,
    strokeWidth?: string,
}): SVGCircleElement {
    const lc = `[${ibCircle.name}]`;
    try {
        stroke = stroke || 'black';
        strokeWidth = strokeWidth || '1px';
        if (!style) {
            style = `stroke:${stroke};stroke-width:${strokeWidth}`;
            if (fill) { style += `;fill:${fill}`; }
        }

        const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
        circle.setAttribute('cx', `${cx}`);
        circle.setAttribute('cy', `${cy}`);
        circle.setAttribute('r', `${r}`);
        if (opacity || opacity == 0) { circle.setAttribute('opacity', opacity.toString()); }
        circle.setAttribute('style', style);

        if (parent) { parent.appendChild(circle); }

        return circle;
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