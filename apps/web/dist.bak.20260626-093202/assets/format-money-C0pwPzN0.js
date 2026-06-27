function n(r){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:r%1===0?0:2}).format(r)}export{n as f};
