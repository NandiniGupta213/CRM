import { useTheme } from '@mui/material';
import { fontFamily } from '../../../theme/typography';
import { useMemo, useState } from 'react';
import { graphic } from 'echarts';
import * as echarts from 'echarts/core';
import ReactEchart from '../../base/ReactEchart';

const CompletedTaskChart = ({ taskData, monthlyTasks = [], ...rest }) => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Generate chart data based on taskData
  const chartData = useMemo(() => {
    // Use monthly tasks data if available
    if (monthlyTasks && monthlyTasks.length > 0) {
      return {
        labels: monthlyTasks.map(m => m.month),
        total: monthlyTasks.map(m => m.total),
        pending: monthlyTasks.map(m => m.statusBreakdown?.todo || 0),
        inProgress: monthlyTasks.map(m => m.statusBreakdown?.['in-progress'] || 0),
        completed: monthlyTasks.map(m => m.statusBreakdown?.completed || 0)
      };
    }
    
    // Fallback to trend data
    if (taskData?.trends?.labels) {
      return {
        labels: taskData.trends.labels,
        total: taskData.trends.total || [],
        pending: taskData.trends.pending || [],
        inProgress: taskData.trends.inProgress || [],
        completed: taskData.trends.completed || []
      };
    }
    
    // Default data
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      labels,
      total: Array(12).fill(0).map((_, i) => Math.floor(Math.random() * 30) + 10),
      pending: Array(12).fill(0).map((_, i) => Math.floor(Math.random() * 15) + 5),
      inProgress: Array(12).fill(0).map((_, i) => Math.floor(Math.random() * 10) + 3),
      completed: Array(12).fill(0).map((_, i) => Math.floor(Math.random() * 8) + 2)
    };
  }, [taskData, monthlyTasks]);

const option = useMemo(
  () => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: '#2f20b5',
      borderColor: theme.palette.divider,
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 12],
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 12,
        fontFamily: fontFamily.monaSans,
      },
      // In your CompletedTaskChart.jsx, update the tooltip formatter:
formatter: function(params) {
  const month = params[0].axisValue;
  const monthIndex = chartData.labels.indexOf(month);
  const monthTasks = monthlyTasks?.[monthIndex]?.tasks || [];
  
  let result = `
    <div style="
      font-weight: 600; 
      font-size: 14px;
      margin-bottom: 10px; 
      color: ${theme.palette.text.primary};
      border-bottom: 2px solid ${theme.palette.primary.main};
      padding-bottom: 6px;
    ">
      📅 ${month} - Task Overview
    </div>
  `;
  
  // Show task statistics
  result += `<div style="margin-bottom: 12px;">`;
  params.forEach((item) => {
    const icon = item.seriesName === 'Total Tasks' 
      ? '📊' 
      : item.seriesName === 'Pending' 
      ? '⏳' 
      : item.seriesName === 'In Progress' 
      ? '🔄' 
      : '✅';
    
    const color = item.color;
    result += `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 4px 0;
        padding: 4px 6px;
        background: ${theme.palette.action.hover};
        border-radius: 4px;
        border-left: 3px solid ${color};
      ">
        <span style="color: ${theme.palette.text.primary}">${icon} ${item.seriesName}</span>
        <span style="font-weight: 700; color: ${color}">${item.value}</span>
      </div>
    `;
  });
  result += `</div>`;
  
  // Show task details if available
  if (monthTasks.length > 0) {
    result += `
      <div style="
        font-weight: 600; 
        font-size: 13px;
        color: ${theme.palette.text.primary}; 
        margin: 12px 0 8px;
        padding-top: 8px;
        border-top: 1px solid ${theme.palette.divider};
      ">
        📋 Task Details (${monthTasks.length} tasks):
      </div>
    `;
    
    // Show tasks in a scrollable container
    result += `<div style="max-height: 300px; overflow-y: auto; padding-right: 4px;">`;
    
    monthTasks.forEach(task => {
      const statusColor = task.status === 'completed' ? theme.palette.success.main :
                        task.status === 'in-progress' ? theme.palette.warning.main :
                        task.status === 'todo' ? theme.palette.info.main :
                        theme.palette.error.main;
      
      const priorityColor = task.priority === 'critical' ? theme.palette.error.main :
                           task.priority === 'high' ? theme.palette.warning.dark :
                           task.priority === 'medium' ? theme.palette.info.main :
                           theme.palette.success.main;
      
      result += `
        <div style="
          margin: 8px 0;
          padding: 10px;
          background: ${theme.palette.action.selected};
          border-radius: 6px;
          border: 1px solid ${theme.palette.divider};
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
          ">
            <div style="font-weight: 600; font-size: 13px; color: ${theme.palette.text.primary};">
              ${task.title}
            </div>
            <div style="
              font-size: 11px;
              background: ${statusColor}25;
              color: ${statusColor};
              padding: 2px 8px;
              border-radius: 12px;
              font-weight: 600;
            ">
              ${task.status}
            </div>
          </div>
          
          <div style="font-size: 11px; color: ${theme.palette.text.secondary}; margin-bottom: 4px;">
            <strong>ID:</strong> ${task.taskId}
          </div>
          
          ${task.description ? `
            <div style="
              font-size: 11px; 
              color: ${theme.palette.text.secondary};
              margin-bottom: 6px;
              line-height: 1.4;
            ">
              ${task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description}
            </div>
          ` : ''}
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
            <div style="
              font-size: 10px;
              background: ${priorityColor}30;
              color: ${priorityColor};
              padding: 2px 6px;
              border-radius: 10px;
              font-weight: 600;
            ">
              ${task.priority} priority
            </div>
            
            <div style="
              font-size: 10px;
              background: ${theme.palette.info.light}30;
              color: ${theme.palette.info.main};
              padding: 2px 6px;
              border-radius: 10px;
              font-weight: 600;
            ">
              ${task.taskType}
            </div>
            
            ${task.progress > 0 ? `
              <div style="
                font-size: 10px;
                background: ${theme.palette.success.light}30;
                color: ${theme.palette.success.main};
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
              ">
                ${task.progress}% complete
              </div>
            ` : ''}
          </div>
          
          ${task.assignedTo && task.assignedTo.length > 0 ? `
            <div style="
              font-size: 10px;
              color: ${theme.palette.text.secondary};
              margin-top: 6px;
              padding-top: 6px;
              border-top: 1px dashed ${theme.palette.divider};
            ">
              <strong>Assigned to:</strong> ${task.assignedTo.map(a => a.name).join(', ')}
            </div>
          ` : ''}
        </div>
      `;
    });
    
    result += `</div>`; // Close scrollable container
  }
  
  return result;
}
    },
      grid: {
        top: 40,
        bottom: 60,
        left: 50,
        right: 30,
      },
      legend: {
        top: 10,
        data: ['Total Tasks', 'Pending', 'In Progress', 'Completed'],
        textStyle: {
          color: theme.palette.text.secondary,
          fontFamily: fontFamily.monaSans,
          fontSize: 12
        }
      },
      xAxis: {
        type: 'category',
        data: chartData.labels,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Number of Tasks',
        nameTextStyle: {
          color: theme.palette.text.secondary,
          fontFamily: fontFamily.monaSans,
          fontSize: 12
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.divider,
            opacity: 0.5,
          },
        },
        min: 0,
      },
      series: [
        {
          name: 'Total Tasks',
          data: chartData.total,
          type: 'bar',
          barWidth: '40%',
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: theme.palette.primary.light },
              { offset: 1, color: theme.palette.primary.main }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          }
        },
        {
          name: 'Pending',
          data: chartData.pending,
          type: 'line',
          showSymbol: true,
          symbolSize: 8,
          smooth: true,
          lineStyle: {
            color: theme.palette.info.main,
            width: 3,
          },
          itemStyle: {
            color: theme.palette.info.main,
          }
        },
        {
          name: 'In Progress',
          data: chartData.inProgress,
          type: 'line',
          showSymbol: true,
          symbolSize: 8,
          smooth: true,
          lineStyle: {
            color: theme.palette.warning.main,
            width: 3,
          },
          itemStyle: {
            color: theme.palette.warning.main,
          }
        },
        {
          name: 'Completed',
          data: chartData.completed,
          type: 'line',
          showSymbol: true,
          symbolSize: 8,
          smooth: true,
          lineStyle: {
            color: theme.palette.success.main,
            width: 3,
          },
          itemStyle: {
            color: theme.palette.success.main,
          }
        },
      ],
    }),
    [theme, chartData, monthlyTasks],
  );

  return <ReactEchart echarts={echarts} option={option} {...rest} />;
};

export default CompletedTaskChart;