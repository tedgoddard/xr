function sign(x)  {
  if (0 == x)  {
    return 1;
  }
  return (x / Math.abs(x));
}

//signed integer part of x
function int(x)  {
  return sign(x) * Math.floor(Math.abs(x));
}

function toHours(d)  {
  return d - (int(d / 24)) * 24;
}

function toDegrees(d)  {
  return d - (int(d / 360)) * 360;
}

const pi = Math.PI;
const twoPi = 2 * pi;
const degs = 180 / pi;
const rads = pi / 180;

//http://spider.seds.org/spider/Misc/alphaUMi.html
const polarisRA =  2 + 31/60 + 50.5/3600; //02 : 31 : 50.5
let latitude = 0;
let longitude = 0;

function setupWithPosition(position)  {
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
}

navigator.geolocation.watchPosition(setupWithPosition)

//from http://aa.usno.navy.mil/faq/docs/JD_Formula.php
//valid for 1801–2099
//replaces port from stargazing.net likely problem being
//unclear use of integer arithmetic
function julianDay(Y, M, D, UT)  {
  const JD = 367*Y - int((7*(Y+int((M+9)/12)))/4) + int((275*M)/9) + 
      D + 1721013.5 + UT/24  - 0.5 * sign(100*Y + M-190002.5) + 0.5;
  return JD;
}

function sunDay(y, m, d, h)  {
  return julianDay(y, m, d, h) - julianDay(2000,1,1,12);
}

var lastUpdate = (new Date()).getTime();

export function ncpInfo()  {
  const date = new Date();
  lastUpdate = date.getTime();
  const h = date.getUTCHours() + (date.getMinutes() / 60) +
      (date.getSeconds() / 3600);
  const jd = julianDay(date.getFullYear(), date.getUTCMonth() + 1,
          date.getUTCDate(), h);
  // console.log("julian date " + jd) ;
  const d = sunDay(date.getFullYear(), date.getUTCMonth() + 1,
          date.getUTCDate(), h);
  // console.log("sunDay " + d) ;
  const gmst = 18.697374558 + 24.06570982441908 * d;
  const gmsthours = toHours(gmst);
  const lsthours = toHours(gmst + longitude / 15);
  const haPolaris = lsthours - polarisRA;
  const angle = 360 - toDegrees(haPolaris * 15);
  return { angle, latitude, longitude }
}
