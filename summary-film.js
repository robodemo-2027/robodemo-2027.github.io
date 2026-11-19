export function initSummaryFilm() {
  const film = document.querySelector('#overview');
  const captions = () => {
    for (const track of film.textTracks) track.mode = 'showing';
  };
  film.addEventListener('loadedmetadata', captions, {once: true});
  captions();
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) film.pause();
  }).observe(film);
}
