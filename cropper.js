var i = document.getElementById('i');
var c = document.getElementById('c');

var sx = 0;
var sy = 0;
var scale = 1.0;

function updateCrop() {
  var ctx = c.getContext('2d');
  ctx.drawImage(i, sx, sy, i.naturalWidth * scale, i.naturalHeight * scale);
}

i.addEventListener('imageLoad', updateCrop);
i.addEventListener('click', function() {
  var src = prompt('url of image to crop:');
  i.src = src;
  updateCrop();
});
document.addEventListener('keydown', function(e) {
  if (e.key == 's') {
    sy -= 1;
    e.preventDefault()
  } else if (e.key == 'd') {
    sx -= 1;
    e.preventDefault()
  } else if (e.key == 'w') {
    sy += 1;
    e.preventDefault()
  } else if (e.key == 'a') {
    sx += 1;
    e.preventDefault();
  } else if (e.key == 'q') {
    scale += 0.01;
    e.preventDefault();
  } else if (e.key == 'e') {
    scale -= 0.01;
    e.preventDefault();
  } else {
    console.log('Unknown key: ' + e.key);
  }
  updateCrop();
});
