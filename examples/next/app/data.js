export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const revenue = {
  labels: MONTHS,
  series: [
    { name: 'Revenue', values: [42, 48, 45, 53, 58, 61, 59, 66, 70, 68, 75, 82] },
    {
      name: 'Costs',
      values: [30, 31, 33, 34, 36, 35, 38, 40, 41, 43, 44, 47],
      dash: 4,
      width: 1.5,
    },
  ],
}

export const channels = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Direct', values: [120, 132, 101, 134] },
    { name: 'Search', values: [220, 182, 191, 234] },
    { name: 'Social', values: [150, 232, 201, 154] },
  ],
}
