#!/bin/bash
# Guarda páginas de exemplo dos supermercados para afinar os leitores de preços.
# Correr no Mac:  bash server/precos/amostras/recolher.sh
cd "$(dirname "$0")"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
get() { # nome url
  code=$(curl -sL -m 25 -A "$UA" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$1.html" -w "%{http_code}" "$2")
  printf "%-28s HTTP %s  %8s bytes  %s\n" "$1" "$code" "$(wc -c < "$1.html" | tr -d ' ')" "$2"
}
Q="purina%20one%20junior"
get continente-produto  "https://www.continente.pt/produto/racao-para-gato-junior-frango-purina-one-7719097.html"
get continente-pesquisa "https://www.continente.pt/pesquisa/?q=$Q"
get pingodoce-pesquisa1 "https://www.pingodoce.pt/pesquisa/?q=$Q"
get pingodoce-pesquisa2 "https://www.pingodoce.pt/on/demandware.store/Sites-pingo-doce-Site/default/Search-Show?q=$Q"
get pingodoce-home      "https://www.pingodoce.pt/"
get auchan-pesquisa     "https://www.auchan.pt/pt/pesquisa?q=$Q"
get intermarche-pesquisa "https://www.intermarche.pt/pesquisa?q=$Q"
get elcorteingles-pesquisa "https://www.elcorteingles.pt/supermercado/pesquisar/?term=purina+one+junior"
get mercadona-home      "https://www.mercadona.pt/"
get lidl-pesquisa       "https://www.lidl.pt/q/search?q=purina"
get aldi-pesquisa       "https://www.aldi.pt/pesquisa.html?query=purina"
# Pesquisas genéricas (listas de produtos), para as sugestões de rações mais baratas
G="racao%20gato%20junior"
get continente-lista    "https://www.continente.pt/pesquisa/?q=$G"
get auchan-lista        "https://www.auchan.pt/pt/pesquisa?q=$G"
get pingodoce-lista     "https://www.pingodoce.pt/pesquisa/?q=$G"
get elcorteingles-lista "https://www.elcorteingles.pt/supermercado/pesquisar/?term=racao+gato+junior"
# Pesquisas genéricas (para as sugestões de rações mais baratas)
get continente-gato-junior   "https://www.continente.pt/pesquisa/?q=ra%C3%A7%C3%A3o%20gato%20junior"
get continente-cao-humida    "https://www.continente.pt/pesquisa/?q=comida%20h%C3%BAmida%20c%C3%A3o"
get auchan-gato-junior       "https://www.auchan.pt/pt/pesquisa?q=ra%C3%A7%C3%A3o%20gato%20junior"
get pingodoce-gato-junior    "https://www.pingodoce.pt/pesquisa/?q=ra%C3%A7%C3%A3o%20gato%20junior"
echo "Feito. Diz ao Claude que já está."
