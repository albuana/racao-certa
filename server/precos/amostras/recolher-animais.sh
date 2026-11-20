#!/bin/bash
# Guarda páginas de pesquisa das lojas de animais para eu escrever os leitores de preços.
# Correr no Mac:  bash server/precos/amostras/recolher-animais.sh
cd "$(dirname "$0")"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
get() { # nome url
  code=$(curl -sL -m 25 -A "$UA" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$1.html" -w "%{http_code}" "$2")
  printf "%-26s HTTP %s  %8s bytes  %s\n" "$1" "$code" "$(wc -c < "$1.html" | tr -d ' ')" "$2"
}
Q="royal%20canin%20sterilised"
get kiwoko-1        "https://www.kiwoko.pt/search?q=$Q"
get kiwoko-2        "https://www.kiwoko.pt/pesquisa?q=$Q"
get kiwoko-home     "https://www.kiwoko.pt/"
get tiendanimal-1   "https://www.tiendanimal.pt/search?q=$Q"
get tiendanimal-2   "https://www.tiendanimal.pt/pesquisa?q=$Q"
get tiendanimal-home "https://www.tiendanimal.pt/"
get zooplus-1       "https://www.zooplus.pt/search/results?q=$Q"
get zooplus-api     "https://www.zooplus.pt/api/discover/v1/search?q=$Q&lang=pt&country=PT"
get maxizoo-1       "https://www.maxizoo.pt/search/?text=$Q"
get bitiba-1        "https://www.bitiba.pt/search/results?q=$Q"
get miscota-1       "https://www.miscota.pt/search?q=$Q"
get elcorteingles-animais "https://www.elcorteingles.pt/animais/pesquisar/?term=royal+canin+sterilised"
# Comida húmida (para o preço por lata/saqueta)
W="saquetas%20gato"
get kiwoko-humida      "https://www.kiwoko.pt/search?q=$W"
get tiendanimal-humida "https://www.tiendanimal.pt/search?q=$W"
echo "Feito. Diz ao Claude que já está."
