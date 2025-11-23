import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Resource } from "@/hooks/useResources";
import { TrendingUp, Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface UserStatsProps {
  resources: Resource[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d"];

const chartConfig = {
  resources: {
    label: "Ressources",
    color: "hsl(var(--primary))",
  },
  downloads: {
    label: "Téléchargements",
    color: "hsl(var(--secondary))",
  },
  views: {
    label: "Vues",
    color: "hsl(var(--accent))",
  },
};

export const UserStats = ({ resources }: UserStatsProps) => {
  // Statistiques par mois (6 derniers mois)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now),
    });

    return months.map((month) => {
      const monthResources = resources.filter((r) => {
        const resourceDate = new Date(r.created_at);
        return (
          resourceDate >= startOfMonth(month) &&
          resourceDate <= endOfMonth(month)
        );
      });

      return {
        month: format(month, "MMM", { locale: fr }),
        resources: monthResources.length,
        downloads: monthResources.reduce((sum, r) => sum + r.downloads_count, 0),
        views: monthResources.reduce((sum, r) => sum + r.views_count, 0),
      };
    });
  }, [resources]);

  // Top 5 ressources les plus populaires
  const topResources = useMemo(() => {
    return resources
      .sort((a, b) => {
        const scoreA = a.downloads_count + a.views_count + (a.average_rating * 10);
        const scoreB = b.downloads_count + b.views_count + (b.average_rating * 10);
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((r) => ({
        name: r.title.length > 20 ? r.title.substring(0, 20) + "..." : r.title,
        popularity: r.downloads_count + r.views_count + (r.average_rating * 10),
        downloads: r.downloads_count,
        views: r.views_count,
        rating: r.average_rating,
      }));
  }, [resources]);

  // Répartition par catégorie
  const categoryDistribution = useMemo(() => {
    const categoryMap = new Map<string, number>();
    resources.forEach((r) => {
      categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [resources]);

  // Répartition par type de ressource
  const typeDistribution = useMemo(() => {
    const typeMap = new Map<string, number>();
    resources.forEach((r) => {
      typeMap.set(r.resource_type, (typeMap.get(r.resource_type) || 0) + 1);
    });

    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name === "file_upload" ? "Fichier" : name === "github_repo" ? "GitHub" : "Lien",
      value,
    }));
  }, [resources]);

  if (resources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Statistiques</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Évolution mensuelle */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Évolution mensuelle</h3>
            <p className="text-sm text-muted-foreground">
              Ressources créées par mois (6 derniers mois)
            </p>
          </div>
          <ChartContainer config={chartConfig}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="resources" fill="var(--color-resources)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Top ressources */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Ressources les plus populaires</h3>
            <p className="text-sm text-muted-foreground">
              Top 5 par popularité (téléchargements + vues + notes)
            </p>
          </div>
          <ChartContainer config={chartConfig}>
            <BarChart data={topResources} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={100}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="popularity" fill="var(--color-resources)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Répartition par catégorie */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Répartition par catégorie</h3>
            <p className="text-sm text-muted-foreground">
              Distribution de vos ressources
            </p>
          </div>
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>

        {/* Répartition par type */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Répartition par type</h3>
            <p className="text-sm text-muted-foreground">
              Types de ressources créées
            </p>
          </div>
          <ChartContainer config={chartConfig}>
            <PieChart>
              <Pie
                data={typeDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {typeDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </Card>
      </div>

      {/* Graphique d'évolution des téléchargements et vues */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="font-semibold mb-1">Téléchargements et vues</h3>
          <p className="text-sm text-muted-foreground">
            Évolution sur les 6 derniers mois
          </p>
        </div>
        <ChartContainer config={chartConfig}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="downloads"
              stroke="var(--color-downloads)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="var(--color-views)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>
    </div>
  );
};

