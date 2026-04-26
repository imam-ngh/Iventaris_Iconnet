const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Update stats calculation
const old_stats_calc = `    const headsets = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'headset').length;
    const laptops = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'laptop').length;

    // Animate count-up for stats
    animateCountUp('totalItems', total);
    animateCountUp('totalMonitors', monitors);
    animateCountUp('totalKeyboards', keyboards);
    animateCountUp('totalMice', mice);
    animateCountUp('totalHeadsets', headsets);
    animateCountUp('totalLaptops', laptops);`;

const new_stats_calc = `    const headsets = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'headset').length;
    const laptops = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'laptop').length;
    const pcs = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'pc').length;
    const tvs = inventoryData.filter(item => item.name && item.name.toLowerCase() === 'tv').length;

    // Animate count-up for stats
    animateCountUp('totalItems', total);
    animateCountUp('totalMonitors', monitors);
    animateCountUp('totalKeyboards', keyboards);
    animateCountUp('totalMice', mice);
    animateCountUp('totalHeadsets', headsets);
    animateCountUp('totalLaptops', laptops);
    animateCountUp('totalPCs', pcs);
    animateCountUp('totalTVs', tvs);`;

content = content.split(old_stats_calc).join(new_stats_calc);
content = content.split(old_stats_calc.replace(/\n/g, '\r\n')).join(new_stats_calc.replace(/\n/g, '\r\n'));

fs.writeFileSync('app.js', content);
console.log('app.js updated');
