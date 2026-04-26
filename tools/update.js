const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// 1. Dashboard stats-grid
const old_grid = `                    <div class="stats-grid">
                        <div class="stat-card total premium-glow">
                            <div class="icon"><i class="fas fa-boxes"></i></div>
                            <div class="number gradient-text" id="totalItems">0</div>
                            <div class="label">Total Items</div>
                        </div>
                        <div class="stat-card monitor premium-glow">
                            <div class="icon"><i class="fas fa-desktop"></i></div>
                            <div class="number gradient-text" id="totalMonitors">0</div>
                            <div class="label">Monitors</div>
                        </div>
                        <div class="stat-card keyboard premium-glow">
                            <div class="icon"><i class="fas fa-keyboard"></i></div>
                            <div class="number gradient-text" id="totalKeyboards">0</div>
                            <div class="label">Keyboards</div>
                        </div>
                        <div class="stat-card mouse premium-glow">
                            <div class="icon"><i class="fas fa-mouse"></i></div>
                            <div class="number gradient-text" id="totalMice">0</div>
                            <div class="label">Mouse</div>
                        </div>
                        <div class="stat-card headset premium-glow">
                            <div class="icon"><i class="fas fa-headset"></i></div>
                            <div class="number gradient-text" id="totalHeadsets">0</div>
                            <div class="label">Headsets</div>
                        </div>
                        <div class="stat-card laptop premium-glow">
                            <div class="icon"><i class="fas fa-laptop"></i></div>
                            <div class="number gradient-text" id="totalLaptops">0</div>
                            <div class="label">Laptops</div>
                        </div>
                    </div>`;

const new_grid = `                    <div class="stats-grid">
                        <div class="stat-card monitor premium-glow">
                            <div class="icon"><i class="fas fa-desktop"></i></div>
                            <div class="number gradient-text" id="totalMonitors">0</div>
                            <div class="label">Monitors</div>
                        </div>
                        <div class="stat-card keyboard premium-glow">
                            <div class="icon"><i class="fas fa-keyboard"></i></div>
                            <div class="number gradient-text" id="totalKeyboards">0</div>
                            <div class="label">Keyboards</div>
                        </div>
                        <div class="stat-card mouse premium-glow">
                            <div class="icon"><i class="fas fa-mouse"></i></div>
                            <div class="number gradient-text" id="totalMice">0</div>
                            <div class="label">Mouse</div>
                        </div>
                        <div class="stat-card headset premium-glow">
                            <div class="icon"><i class="fas fa-headset"></i></div>
                            <div class="number gradient-text" id="totalHeadsets">0</div>
                            <div class="label">Headsets</div>
                        </div>
                        <div class="stat-card laptop premium-glow">
                            <div class="icon"><i class="fas fa-laptop"></i></div>
                            <div class="number gradient-text" id="totalLaptops">0</div>
                            <div class="label">Laptops</div>
                        </div>
                        <div class="stat-card pc premium-glow">
                            <div class="icon"><i class="fas fa-server"></i></div>
                            <div class="number gradient-text" id="totalPCs">0</div>
                            <div class="label">PC</div>
                        </div>
                        <div class="stat-card tv premium-glow">
                            <div class="icon"><i class="fas fa-tv"></i></div>
                            <div class="number gradient-text" id="totalTVs">0</div>
                            <div class="label">TV</div>
                        </div>
                        <div class="stat-card total premium-glow">
                            <div class="icon"><i class="fas fa-boxes"></i></div>
                            <div class="number gradient-text" id="totalItems">0</div>
                            <div class="label">Total Items</div>
                        </div>
                    </div>`;

content = content.replace(old_grid, new_grid);
content = content.replace(old_grid.replace(/\n/g, '\r\n'), new_grid.replace(/\n/g, '\r\n'));

// Option block type 1
const options_block = `<option value="Monitor">Monitor</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Keyboard">Keyboard</option>
                                <option value="Mouse">Mouse</option>
                                <option value="Headset">Headset</option>`;
                                
const new_options_block = `<option value="Monitor">Monitor</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Keyboard">Keyboard</option>
                                <option value="Mouse">Mouse</option>
                                <option value="Headset">Headset</option>
                                <option value="PC">PC</option>
                                <option value="TV">TV</option>`;

content = content.split(options_block).join(new_options_block);
content = content.split(options_block.replace(/\n/g, '\r\n')).join(new_options_block.replace(/\n/g, '\r\n'));

// Option block type 2
const options_block2 = `<option value="Monitor">Monitor</option>
                                            <option value="Laptop">Laptop</option>
                                            <option value="Keyboard">Keyboard</option>
                                            <option value="Mouse">Mouse</option>
                                            <option value="Headset">Headset</option>`;

const new_options_block2 = `<option value="Monitor">Monitor</option>
                                            <option value="Laptop">Laptop</option>
                                            <option value="Keyboard">Keyboard</option>
                                            <option value="Mouse">Mouse</option>
                                            <option value="Headset">Headset</option>
                                            <option value="PC">PC</option>
                                            <option value="TV">TV</option>`;

content = content.split(options_block2).join(new_options_block2);
content = content.split(options_block2.replace(/\n/g, '\r\n')).join(new_options_block2.replace(/\n/g, '\r\n'));

// Edit form item name
const old_edit_item = `<label>Nama Barang</label>
                        <input type="text" id="editItemName" required>`;

const new_edit_item = `<label>Nama Barang</label>
                        <select id="editItemName" required>
                            <option value="">Pilih Nama Barang</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Laptop">Laptop</option>
                            <option value="Keyboard">Keyboard</option>
                            <option value="Mouse">Mouse</option>
                            <option value="Headset">Headset</option>
                            <option value="PC">PC</option>
                            <option value="TV">TV</option>
                        </select>`;

content = content.split(old_edit_item).join(new_edit_item);
content = content.split(old_edit_item.replace(/\n/g, '\r\n')).join(new_edit_item.replace(/\n/g, '\r\n'));

fs.writeFileSync('index.html', content);
console.log('index.html successfully updated.');
