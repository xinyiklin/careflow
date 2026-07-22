import { TechLogo } from "./TechLogo";
import { Reveal } from "./Reveal";
import { STACK } from "../content";

export function Stack() {
  return (
    <section
      id="stack"
      className="cf-page-shell scroll-mt-20 py-16 md:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-4">
          <h2 className="text-3xl font-semibold tracking-tight text-cf-text sm:text-4xl">
            Built with
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-cf-text-muted">
            Typed React frontends and a versioned Django REST API, deployed as
            separate surfaces over one PostgreSQL database.
          </p>
        </Reveal>

        <Reveal
          delay={120}
          className="grid gap-x-8 gap-y-10 sm:grid-cols-3 lg:col-span-8"
        >
          {STACK.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-cf-text">
                {group.label}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {group.items.map((item) => (
                  <li
                    key={item.slug}
                    className="flex items-center gap-3 text-sm text-cf-text-muted"
                  >
                    <TechLogo slug={item.slug} name={item.name} />
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
