'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AdminDailyCount, AdminActivityDaily } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserGrowthChartProps {
  data: AdminDailyCount[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get container dimensions
    const container = svgRef.current.parentElement;
    const containerWidth = container ? container.clientWidth : 600;
    const containerHeight = container ? container.clientHeight : 300;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .nice()
      .range([height, 0]);

    const line = d3.line<AdminDailyCount>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%d/%m") as any));

    g.append("g")
      .call(d3.axisLeft(y).ticks(5));

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    g.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(new Date(d.date)))
      .attr("cy", d => y(d.count))
      .attr("r", 4)
      .attr("fill", "hsl(var(--background))")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 2);

  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tăng trưởng người dùng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px]">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityChartProps {
  data: AdminActivityDaily[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get container dimensions
    const container = svgRef.current.parentElement;
    const containerWidth = container ? container.clientWidth : 600;
    const containerHeight = container ? container.clientHeight : 300;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.posts + d.comments + d.reactions) || 0])
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(['posts', 'comments', 'reactions'])
      .range(['#3b82f6', '#10b981', '#f59e0b']);

    const stack = d3.stack<AdminActivityDaily>()
      .keys(['posts', 'comments', 'reactions'])
      (data);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        const date = new Date(d);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }));

    g.append("g")
      .call(d3.axisLeft(y).ticks(5));

    g.selectAll("g.layer")
      .data(stack)
      .enter().append("g")
      .classed("layer", true)
      .attr("fill", d => color(d.key) as string)
      .selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => x(d.data.date) || 0)
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

    // Legend
    const legend = svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "end")
      .selectAll("g")
      .data(['posts', 'comments', 'reactions'].slice().reverse())
      .enter().append("g")
      .attr("transform", (d, i) => `translate(-${margin.right},${i * 20})`);

    legend.append("rect")
      .attr("x", width - 19)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", color as any);

    legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(d => d === 'posts' ? 'Bài viết' : d === 'comments' ? 'Bình luận' : 'Cảm xúc');

  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động hệ thống</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px]">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}
