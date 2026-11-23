import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 86_400_000;

function at(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() + dayOffset * DAY);
}

const equipment = [
  { key: 'gpu', name: 'RTX 4090 GPU Workstation', category: 'Compute', department: 'CS', location: 'CS Block, Room 204', description: 'High-end workstation for deep learning training and inference.', specs: { GPU: 'NVIDIA RTX 4090 24GB', CPU: 'Ryzen 9 7950X', RAM: '128GB DDR5' } },
  { key: 'jetson', name: 'Jetson AGX Orin Dev Kit', category: 'Compute', department: 'CS', location: 'CS Block, Room 206', description: 'Edge AI module for embedded vision and robotics projects.', specs: { AI: '275 TOPS', Memory: '64GB', Power: '15-60W' } },
  { key: 'pi', name: 'Raspberry Pi 8-Node Cluster', category: 'Compute', department: 'CS', location: 'CS Block, Room 210', description: 'Distributed computing testbed with Kubernetes preinstalled.', specs: { Nodes: '8x Pi 5', Network: 'Gigabit switch', Storage: 'NVMe per node' } },
  { key: 'scope', name: 'Keysight Oscilloscope DSOX1204G', category: 'Instrumentation', department: 'Electronics', location: 'EE Lab 1', description: '4-channel digital oscilloscope with built-in waveform generator.', specs: { Bandwidth: '70MHz', Channels: '4', SampleRate: '2GSa/s' } },
  { key: 'spectrum', name: 'Rigol Spectrum Analyzer', category: 'Instrumentation', department: 'Electronics', location: 'EE Lab 1', description: 'RF spectrum analysis for communications projects.', specs: { Range: '9kHz-3.2GHz', RBW: '1Hz', Display: '10.1in' } },
  { key: 'reflow', name: 'Reflow Soldering Oven', category: 'Fabrication', department: 'Electronics', location: 'EE Lab 2', description: 'Programmable SMD reflow oven for PCB assembly.', specs: { Zones: '6', MaxTemp: '300C', Area: '300x320mm' } },
  { key: 'psu', name: 'Programmable DC Power Supply', category: 'Testing', department: 'Electronics', location: 'EE Lab 2', description: 'Triple-output bench supply with remote control.', specs: { Outputs: '3', Voltage: '0-30V', Current: '0-5A' } },
  { key: 'prusa', name: 'Prusa MK4 3D Printer', category: 'Fabrication', department: 'Mechanical', location: 'Workshop A', description: 'Reliable FDM printer for rapid prototyping.', specs: { Volume: '250x210x220mm', Nozzle: '0.4mm', Materials: 'PLA, PETG, ASA' } },
  { key: 'form3', name: 'Formlabs Form 3 Resin Printer', category: 'Fabrication', department: 'Mechanical', location: 'Workshop A', description: 'High-resolution SLA printer for detailed parts.', specs: { Resolution: '25 micron', Volume: '145x145x185mm', Process: 'LFS' } },
  { key: 'cnc', name: 'Haas Mini CNC Mill', category: 'Machining', department: 'Mechanical', location: 'Workshop B', description: '3-axis CNC milling machine for aluminium and plastics.', specs: { Axes: '3', Spindle: '10000 RPM', Travel: '406x305x254mm' }, status: 'MAINTENANCE' },
  { key: 'tensile', name: 'Universal Tensile Tester', category: 'Testing', department: 'Mechanical', location: 'Materials Lab', description: 'Tensile and compression testing for material characterisation.', specs: { Capacity: '50kN', Accuracy: '0.5%', Software: 'Bluehill' } },
  { key: 'ur5', name: 'UR5e Collaborative Robot Arm', category: 'Robotics', department: 'Mechanical', location: 'Robotics Bay', description: '6-axis cobot for automation and pick-and-place research.', specs: { Payload: '5kg', Reach: '850mm', Repeatability: '0.03mm' } }
];

async function main(): Promise<void> {
  await prisma.booking.deleteMany();
  await prisma.equipment.deleteMany();

  const ids: Record<string, string> = {};
  for (const e of equipment) {
    const row = await prisma.equipment.create({
      data: { name: e.name, category: e.category, department: e.department, location: e.location, description: e.description, specs: JSON.stringify(e.specs), status: e.status ?? 'AVAILABLE' }
    });
    ids[e.key] = row.id;
  }
  // A twelfth item
  const laser = await prisma.equipment.create({
    data: { name: 'Epilog Laser Cutter', category: 'Fabrication', department: 'Mechanical', location: 'Workshop A', description: '60W CO2 laser for acrylic, wood and sheet cutting.', specs: JSON.stringify({ Power: '60W', Bed: '812x508mm', Software: 'Epilog Dashboard' }) }
  });
  ids.laser = laser.id;

  const b = (key: string, studentName: string, projectTitle: string, description: string, deadlineDays: number, start: Date, end: Date, status: string) =>
    prisma.booking.create({ data: { equipmentId: ids[key], studentName, projectTitle, description, deadline: at(deadlineDays, 17), startTime: start, endTime: end, status } });

  // Conflict 1: GPU workstation, tomorrow
  await b('gpu', 'Aisha Khan', 'Diffusion Model Fine-Tuning', 'Fine-tune a small diffusion model for my final-year thesis demo.', 3, at(1, 10), at(1, 14), 'PENDING');
  await b('gpu', 'Rohan Mehta', 'RL Benchmark Sweep', 'Hyperparameter sweep for a reinforcement learning benchmark paper.', 10, at(1, 12), at(1, 16), 'PENDING');
  // Conflict 2: UR5e arm, in two days
  await b('ur5', 'Karthik Rao', 'Pick-and-Place Capstone', 'Capstone demo requires calibrated pick-and-place of mixed parts.', 2, at(2, 11), at(2, 15), 'PENDING');
  await b('ur5', 'Meera Nair', 'Cobot Gesture Control', 'Gesture-driven control of a cobot for an HCI course project.', 5, at(2, 9), at(2, 13), 'PENDING');
  // Other activity for analytics
  const now = new Date();
  await b('prusa', 'Dev Patel', 'Drone Frame Prototype', 'Printing lightweight drone arms for flight tests.', 4, new Date(now.getTime() - 1 * 3_600_000), new Date(now.getTime() + 3 * 3_600_000), 'APPROVED');
  await b('scope', 'Sana Iqbal', 'Op-Amp Filter Design', 'Characterising active filter frequency response.', 6, at(1, 9), at(1, 12), 'APPROVED');
  await b('scope', 'Imran Shah', 'Signal Integrity Study', 'Measuring rise times on high-speed traces.', 9, at(3, 10), at(3, 13), 'APPROVED');
  await b('tensile', 'Lakshmi Iyer', 'Composite Laminate Testing', 'Tensile testing of carbon-fibre coupons.', 7, at(2, 14), at(2, 17), 'APPROVED');
  await b('jetson', 'Arjun Das', 'Edge Object Detection', 'Deploying YOLO on the Orin for a campus safety demo.', 8, at(4, 10), at(4, 13), 'PENDING');
  await b('reflow', 'Neha Joshi', 'IoT Sensor PCB', 'Assembling SMD sensor boards.', 12, at(3, 15), at(3, 17), 'PENDING');
  await b('form3', 'Vikram Singh', 'Prosthetic Hand Mockup', 'Resin printing of finger joints.', 14, at(5, 10), at(5, 14), 'REJECTED');

  console.log('Seeded ' + (equipment.length + 1) + ' equipment items and 2 active scheduling conflicts.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
