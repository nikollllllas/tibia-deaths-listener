export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/include/character/tab.php') {
      return new Response('Not found', { status: 404 })
    }
    return fetch(`https://guildstats.eu${url.pathname}${url.search}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Referer: 'https://guildstats.eu/',
      },
    })
  },
}
