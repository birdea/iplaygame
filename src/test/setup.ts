import '@testing-library/jest-dom';

if (typeof window !== 'undefined' && (window as any).CanvasRenderingContext2D) {
    (window as any).CanvasRenderingContext2D.prototype.roundRect = function () {
        return this.rect.apply(this, arguments as any);
    };
}
