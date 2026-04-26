const fs = require('fs');
let content = fs.readFileSync('css/style.css', 'utf8');

// Update columns
const old_stats_grid = `grid-template-columns: repeat(6, 1fr);`;
const new_stats_grid = `grid-template-columns: repeat(7, 1fr);`;
content = content.replace(old_stats_grid, new_stats_grid);

// Add full width for total and PC/TV icon styles
const old_laptop_icon = `.stat-card.laptop .icon {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
}`;
const new_laptop_icon = `.stat-card.laptop .icon {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
}

.stat-card.pc .icon {
    background: linear-gradient(135deg, #334155, #0f172a);
    color: white;
}

.stat-card.tv .icon {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
}

.stat-card.total {
    grid-column: 1 / -1;
}`;
content = content.split(old_laptop_icon).join(new_laptop_icon);
content = content.split(old_laptop_icon.replace(/\n/g, '\r\n')).join(new_laptop_icon.replace(/\n/g, '\r\n'));

// At line 2950 there might be animation delays
const old_anim = `.stat-card:nth-child(5) { animation-delay: 0.4s; }`;
const new_anim = `.stat-card:nth-child(5) { animation-delay: 0.4s; }
.stat-card:nth-child(6) { animation-delay: 0.5s; }
.stat-card:nth-child(7) { animation-delay: 0.6s; }`;
content = content.replace(old_anim, new_anim);
content = content.replace(old_anim.replace(/\n/g, '\r\n'), new_anim.replace(/\n/g, '\r\n'));

fs.writeFileSync('css/style.css', content);
console.log('style.css updated');
