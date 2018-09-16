$(function() {
  var webcam = undefined;

  function startVideoCapture() {
    const video = document.getElementById('cam');
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
      video.srcObject = stream;
      video.style.display = 'inline';
      webcam = stream;
    });
  }

  function stopVideoCapture() {
    const video = document.getElementById('cam');
    video.srcObject = undefined;
    video.style.display = 'none';
    webcam.getVideoTracks()[0].stop();
    webcam = undefined;
  }

  document.getElementById('camtoggle').addEventListener('click', function(e) {
    if (webcam) {
      stopVideoCapture();
    } else {
      startVideoCapture();
    }
  });
});
