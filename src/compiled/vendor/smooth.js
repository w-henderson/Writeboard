CanvasRenderingContext2D.prototype.curve = function (pts, ts, nos) {
    if (nos === void 0) { nos = 16; }
    var _pts = [], res = [], x, y, t1x, t2x, t1y, t2y, c1, c2, c3, c4, st, st2, st3, st23, st32, t, i, l = pts.length, pt1, pt2, pt3, pt4;
    _pts.push(pts[0]);
    _pts.push(pts[1]);
    _pts = _pts.concat(pts);
    _pts.push(pts[l - 2]);
    _pts.push(pts[l - 1]);
    this.moveTo(pts[0], pts[1]);
    for (i = 2; i < l; i += 2) {
        pt1 = _pts[i];
        pt2 = _pts[i + 1];
        pt3 = _pts[i + 2];
        pt4 = _pts[i + 3];
        t1x = (pt3 - _pts[i - 2]) * ts;
        t2x = (_pts[i + 4] - pt1) * ts;
        t1y = (pt4 - _pts[i - 1]) * ts;
        t2y = (_pts[i + 5] - pt2) * ts;
        for (t = 0; t <= nos; t++) {
            st = t / nos;
            st2 = st * st;
            st3 = st2 * st;
            st23 = st3 * 2;
            st32 = st2 * 3;
            c1 = st23 - st32 + 1;
            c2 = st32 - st23;
            c3 = st3 - 2 * st2 + st;
            c4 = st3 - st2;
            res.push(c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x);
            res.push(c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y);
        }
    }
    l = res.length;
    for (i = 0; i < l; i += 2)
        this.lineTo(res[i], res[i + 1]);
    return res;
};
