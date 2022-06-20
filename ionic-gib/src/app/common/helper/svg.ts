export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function ibCircle({
    svg,
    cx, cy,
    r,
    style,
    fill,
    opacity,
    stroke,
    strokeWidth,
}: {
    cx: number, cy: number,
    r: number,
    style?: string,
    fill?: string,
    opacity?: number,
    stroke?: string,
    strokeWidth?: string,
    /**
     * If provided, will add to the svg
     */
    svg?: SVGElement,
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

        if (svg) { svg.appendChild(circle); }

        return circle;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

