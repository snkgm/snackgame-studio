export const FONTS=[{"family": "Montserrat", "weights": [400, 600, 700, 800]}, {"family": "Poppins", "weights": [400, 600, 700]}, {"family": "Inter", "weights": [400, 600, 700]}, {"family": "Oswald", "weights": [500, 700]}, {"family": "Bebas Neue", "weights": [400]}, {"family": "Anton", "weights": [400]}];
export const loadFont=async(family,weight)=>{try{await document.fonts.load(`${weight} 32px "${family}"`)}catch{}};
export const loadAllFonts=()=>Promise.all(FONTS.flatMap(f=>f.weights.map(w=>loadFont(f.family,w))));
